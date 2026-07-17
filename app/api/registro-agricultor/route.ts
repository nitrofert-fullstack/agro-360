import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { emailSchema, nombreCompletoSchema, numeroDocumentoSchema } from '@/lib/schemas/caracterizacion'

export async function POST(request: Request) {
  const ip = (request.headers.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0].trim()
  if (!checkRateLimit(ip, 5)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta de nuevo en un minuto.' },
      { status: 429 }
    )
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { email, password, nombre_completo, telefono, numero_documento } = body
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const normalizedDocumento = typeof numero_documento === 'string' ? numero_documento.trim() : ''

    if (!normalizedEmail || !password || !nombre_completo) {
      return NextResponse.json({ error: 'Correo, contraseña y nombre son requeridos' }, { status: 400 })
    }
    if (!normalizedDocumento) {
      return NextResponse.json({ error: 'El número de documento es requerido' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    const emailCheck = emailSchema.safeParse(normalizedEmail)
    if (!emailCheck.success) {
      return NextResponse.json({ error: emailCheck.error.issues[0].message }, { status: 400 })
    }
    const docCheck = numeroDocumentoSchema.safeParse(normalizedDocumento)
    if (!docCheck.success) {
      return NextResponse.json({ error: docCheck.error.issues[0].message }, { status: 400 })
    }
    const nombreCheck = nombreCompletoSchema.safeParse(nombre_completo)
    if (!nombreCheck.success) {
      return NextResponse.json({ error: nombreCheck.error.issues[0].message }, { status: 400 })
    }

    const existingProfile = await prisma.profiles.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { numero_documento: normalizedDocumento },
        ],
      },
      select: { id: true },
    })

    if (existingProfile) {
      return NextResponse.json(
        { error: 'No fue posible crear la cuenta. Verifica los datos o intenta iniciar sesión.' },
        { status: 409 }
      )
    }

    // Crear usuario en Supabase Auth (auth.users no lo maneja Prisma)
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo, telefono: telefono || null, rol: 'agricultor', numero_documento: normalizedDocumento },
    })

    if (createErr) {
      if (createErr.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'No fue posible crear la cuenta. Verifica los datos o intenta iniciar sesión.' },
          { status: 409 }
        )
      }
      throw createErr
    }

    if (!newUser?.user) throw new Error('No se pudo crear el usuario')

    try {
      await prisma.profiles.create({
        data: {
          id:              newUser.user.id,
          email:           normalizedEmail,
          nombre_completo,
          telefono:        telefono || null,
          rol:             'agricultor',
          activo:          true,
          numero_documento: normalizedDocumento,
        },
      })
    } catch (profileErr) {
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      throw profileErr
    }

    return NextResponse.json({
      exito:   true,
      mensaje: 'Cuenta creada exitosamente. Puedes iniciar sesión con tus credenciales.',
    })
  } catch (err) {
    console.error('[RegistroAgricultor] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al crear la cuenta' },
      { status: 500 }
    )
  }
}
