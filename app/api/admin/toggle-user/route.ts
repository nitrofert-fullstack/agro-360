import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { isUuid } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL
    if (origin && allowedOrigin && !origin.startsWith('http://localhost') && origin !== allowedOrigin) {
      return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const adminProfile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { rol: true },
    })

    if (adminProfile?.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden realizar esta accion' }, { status: 403 })
    }

    const { userId, activo } = await request.json()

    if (!userId || typeof activo !== 'boolean') {
      return NextResponse.json({ error: 'userId y activo son requeridos' }, { status: 400 })
    }

    if (!isUuid(userId)) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    const targetProfile = await prisma.profiles.findUnique({
      where:  { id: userId },
      select: { rol: true },
    })

    if (targetProfile?.rol === 'admin') {
      return NextResponse.json({ error: 'No se puede suspender a un administrador' }, { status: 400 })
    }

    await prisma.profiles.update({
      where: { id: userId },
      data:  { activo, updated_at: new Date() },
    })

    // Ban/unban a nivel Supabase Auth
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: activo ? 'none' : '876000h',
    })

    return NextResponse.json({
      success: true,
      mensaje: activo ? 'Cuenta habilitada correctamente' : 'Cuenta suspendida correctamente',
    })
  } catch (err) {
    console.error('[ToggleUser] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
