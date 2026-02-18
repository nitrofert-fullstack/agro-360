import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar que el solicitante sea admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (adminProfile?.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden realizar esta accion' }, { status: 403 })
    }

    const { userId, activo } = await request.json()

    if (!userId || typeof activo !== 'boolean') {
      return NextResponse.json({ error: 'userId y activo son requeridos' }, { status: 400 })
    }

    // No permitir suspender admins
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', userId)
      .single()

    if (targetProfile?.rol === 'admin') {
      return NextResponse.json({ error: 'No se puede suspender a un administrador' }, { status: 400 })
    }

    // Actualizar profiles.activo
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ activo })
      .eq('id', userId)

    if (profileErr) throw profileErr

    // Si hay service role key, también ban/unban a nivel de Supabase Auth
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (serviceRoleKey && supabaseUrl) {
      const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey)

      if (!activo) {
        // Suspender: ban por 100 años (efectivamente permanente hasta que se reactive)
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: '876000h',
        })
      } else {
        // Reactivar: remover ban
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: 'none',
        })
      }
    }

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
