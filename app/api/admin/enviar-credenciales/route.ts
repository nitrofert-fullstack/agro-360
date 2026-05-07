import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendEmail, buildCredentialsEmail } from '@/lib/email/mailer'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const callerProfile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { rol: true },
    })

    if (!['admin', 'asesor'].includes(callerProfile?.rol ?? '')) {
      return NextResponse.json({ error: 'No tienes permiso para esta acción' }, { status: 403 })
    }

    const { correo, nombreCompleto, beneficiarioId } = await request.json()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!correo || !emailRegex.test(correo)) {
      return NextResponse.json({ error: 'Correo inválido' }, { status: 400 })
    }
    if (!nombreCompleto) {
      return NextResponse.json({ error: 'Nombre completo requerido' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const tempPassword = `Agro${crypto.randomBytes(4).toString('hex').toUpperCase()}!`

    // Buscar si ya existe un perfil con ese correo
    const existingProfile = await prisma.profiles.findFirst({
      where: { email: correo },
      select: { id: true },
    })

    let emailEnviado = false

    if (existingProfile) {
      // Ya tiene cuenta → resetear contraseña y reenviar
      await supabaseAdmin.auth.admin.updateUser(existingProfile.id, {
        password: tempPassword,
      })

      emailEnviado = await sendEmail({
        to: correo,
        subject: 'Santander Agro360 — Nuevas credenciales de acceso',
        html: buildCredentialsEmail({
          nombreCompleto,
          email: correo,
          password: tempPassword,
          rol: 'campesino',
          appUrl,
        }),
      })
    } else {
      // No tiene cuenta → crear usuario y enviar credenciales
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: correo,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { nombre_completo: nombreCompleto, rol: 'campesino' },
      })

      if (createErr) {
        return NextResponse.json({ error: `Error creando usuario: ${createErr.message}` }, { status: 500 })
      }

      if (newUser?.user) {
        await prisma.profiles.upsert({
          where: { id: newUser.user.id },
          create: {
            id: newUser.user.id,
            email: correo,
            nombre_completo: nombreCompleto,
            rol: 'campesino',
            activo: true,
          },
          update: {
            email: correo,
            nombre_completo: nombreCompleto,
            rol: 'campesino',
            activo: true,
            updated_at: new Date(),
          },
        })

        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)
        await prisma.invitations.create({
          data: {
            email: correo,
            token: crypto.randomBytes(32).toString('hex'),
            rol: 'campesino',
            invitado_por: user.id,
            usado: true,
            expires_at: expiresAt,
          },
        })
      }

      emailEnviado = await sendEmail({
        to: correo,
        subject: 'Bienvenido a Santander Agro360 — Tus credenciales de acceso',
        html: buildCredentialsEmail({
          nombreCompleto,
          email: correo,
          password: tempPassword,
          rol: 'campesino',
          appUrl,
        }),
      })
    }

    // Actualizar correo en beneficiarios si se proveyó un ID y el correo cambió
    if (beneficiarioId) {
      await prisma.beneficiarios.update({
        where: { id: beneficiarioId },
        data: { correo },
      })
    }

    return NextResponse.json({
      success: true,
      emailEnviado,
      credenciales: { email: correo, password: tempPassword },
      mensaje: emailEnviado
        ? `Credenciales enviadas a ${correo}`
        : `Cuenta lista. Email: ${correo} | Contraseña: ${tempPassword}`,
    })
  } catch (err) {
    console.error('[EnviarCredenciales] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
