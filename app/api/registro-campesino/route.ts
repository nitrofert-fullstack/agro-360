import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: 'Configuración del servidor incompleta' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const { email, password, nombre_completo, telefono, numero_documento } = body

    if (!email || !password || !nombre_completo) {
      return NextResponse.json(
        { error: 'Correo, contraseña y nombre son requeridos' },
        { status: 400 }
      )
    }
    if (!numero_documento) {
      return NextResponse.json(
        { error: 'El número de documento es requerido' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

    // Verificar si ya existe un usuario con ese email
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, rol')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este correo electrónico' },
        { status: 409 }
      )
    }

    // Crear usuario con rol campesino
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // No requiere confirmación de email (acceso inmediato)
      user_metadata: {
        nombre_completo,
        telefono: telefono || null,
        rol: 'campesino',
        numero_documento,
      },
    })

    if (createErr) {
      if (createErr.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'Ya existe una cuenta con este correo electrónico' },
          { status: 409 }
        )
      }
      throw createErr
    }

    if (!newUser?.user) {
      throw new Error('No se pudo crear el usuario')
    }

    // Crear perfil en la tabla profiles
    const { error: profileErr } = await adminClient
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email,
        nombre_completo,
        telefono: telefono || null,
        rol: 'campesino',
        activo: true,
        numero_documento,
      })

    if (profileErr) {
      console.error('[RegistroCampesino] Error creando perfil:', profileErr.message)
      // No es fatal — el usuario puede iniciar sesión aunque el perfil falle
    }

    console.log(`[RegistroCampesino] Agricultor registrado: ${email}`)

    return NextResponse.json({
      exito: true,
      mensaje: 'Cuenta creada exitosamente. Puedes iniciar sesión con tus credenciales.',
    })
  } catch (err) {
    console.error('[RegistroCampesino] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al crear la cuenta' },
      { status: 500 }
    )
  }
}
