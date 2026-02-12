import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { email, nombreCompleto, visitaId, telefono } = await request.json()

    if (!email || !nombreCompleto) {
      return NextResponse.json({ error: 'email y nombreCompleto son requeridos' }, { status: 400 })
    }

    // Generar credenciales temporales
    const tempPassword = `Agro${crypto.randomBytes(4).toString('hex').toUpperCase()}!`
    const token = crypto.randomBytes(32).toString('hex')

    // Intentar crear usuario con admin client (service role key)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    let userId: string | null = null
    let method: 'admin' | 'invitation' = 'invitation'

    if (serviceRoleKey && supabaseUrl) {
      // Usar admin API para crear usuario directamente
      const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey)

      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          nombre_completo: nombreCompleto,
          telefono: telefono || null,
          rol: 'campesino',
        },
      })

      if (createErr) {
        // Si el usuario ya existe, no es un error fatal
        if (createErr.message?.includes('already been registered') || createErr.message?.includes('already exists')) {
          return NextResponse.json({
            error: 'Este correo ya tiene una cuenta registrada. El beneficiario puede iniciar sesion con sus credenciales existentes.',
          }, { status: 409 })
        }
        console.error('[Invitar] Error creando usuario:', createErr.message)
        return NextResponse.json({ error: `Error creando usuario: ${createErr.message}` }, { status: 500 })
      }

      if (newUser?.user) {
        userId = newUser.user.id
        method = 'admin'

        // Crear perfil con rol campesino
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          email,
          nombre_completo: nombreCompleto,
          telefono: telefono || null,
          rol: 'campesino',
          activo: true,
        })
      }
    } else {
      // Sin service role key: solo crear registro de invitacion
      method = 'invitation'
    }

    // Crear registro de invitacion
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await supabase.from('invitations').insert({
      email,
      token,
      rol: 'campesino',
      invitado_por: user.id,
      usado: method === 'admin',
      expires_at: expiresAt.toISOString(),
    })

    // Si hay visitaId, marcar la visita como aprobada
    if (visitaId) {
      await supabase.from('visitas').update({
        estado: 'APROBADO',
        updated_at: new Date().toISOString(),
      }).eq('id', visitaId)
    }

    return NextResponse.json({
      success: true,
      method,
      credenciales: method === 'admin' ? {
        email,
        password: tempPassword,
      } : null,
      invitationUrl: method === 'invitation'
        ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/auth/invitation?token=${token}`
        : null,
      mensaje: method === 'admin'
        ? `Cuenta creada exitosamente. Las credenciales del beneficiario son: Email: ${email} | Contrasena temporal: ${tempPassword}`
        : `Invitacion creada. Comparta este enlace con el beneficiario para que complete su registro.`,
    })
  } catch (err) {
    console.error('[Invitar] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
