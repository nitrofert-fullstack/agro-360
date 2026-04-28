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

    if (callerProfile?.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden crear cuentas' }, { status: 403 })
    }

    const { email, nombreCompleto, telefono, rol: rolParam } = await request.json()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }
    if (!nombreCompleto) {
      return NextResponse.json({ error: 'email y nombreCompleto son requeridos' }, { status: 400 })
    }

    const existingProfile = await prisma.profiles.findFirst({
      where: { email },
      select: { id: true },
    })

    if (existingProfile) {
      return NextResponse.json({
        error: 'Este correo ya tiene una cuenta registrada en el sistema.',
        code: 'EMAIL_EXISTS',
      }, { status: 409 })
    }

    const rolesValidos = ['admin', 'asesor', 'agricultor', 'analista']
    const rol = rolesValidos.includes(rolParam) ? rolParam : 'agricultor'

    const tempPassword = `Agro${crypto.randomBytes(4).toString('hex').toUpperCase()}!`
    const token = crypto.randomBytes(32).toString('hex')

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let userId: string | null = null
    let method: 'admin' | 'invitation' = 'invitation'

    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { nombre_completo: nombreCompleto, telefono: telefono || null, rol },
    })

    if (createErr) {
      if (createErr.message?.includes('already been registered') || createErr.message?.includes('already exists')) {
        return NextResponse.json({ error: 'Este correo ya tiene una cuenta registrada.' }, { status: 409 })
      }
      console.error('[Invitar] Error creando usuario:', createErr.message)
      return NextResponse.json({ error: `Error creando usuario: ${createErr.message}` }, { status: 500 })
    }

    if (newUser?.user) {
      userId = newUser.user.id
      method = 'admin'

      await prisma.profiles.upsert({
        where:  { id: userId },
        create: { id: userId, email, nombre_completo: nombreCompleto, telefono: telefono || null, rol, activo: true },
        update: { email, nombre_completo: nombreCompleto, telefono: telefono || null, rol, activo: true, updated_at: new Date() },
      })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await prisma.invitations.create({
      data: {
        email,
        token,
        rol,
        invitado_por: user.id,
        usado: method === 'admin',
        expires_at: expiresAt,
      },
    })

    let emailEnviado = false
    if (method === 'admin') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      emailEnviado = await sendEmail({
        to: email,
        subject: 'Bienvenido a Agro360 — Tus credenciales de acceso',
        html: buildCredentialsEmail({ nombreCompleto, email, password: tempPassword, rol, appUrl }),
      })
    }

    return NextResponse.json({
      success: true,
      method,
      emailEnviado,
      credenciales: method === 'admin' ? { email, password: tempPassword } : null,
      invitationUrl: method === 'invitation'
        ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/auth/invitation?token=${token}`
        : null,
      mensaje: method === 'admin'
        ? emailEnviado
          ? `Cuenta creada y credenciales enviadas por email a ${email}.`
          : `Cuenta creada. Email: ${email} | Contraseña temporal: ${tempPassword}`
        : 'Invitación creada.',
    })
  } catch (err) {
    console.error('[Invitar] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
