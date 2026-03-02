import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar que sea admin
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
      return NextResponse.json({ error: 'Solo administradores pueden cambiar roles' }, { status: 403 })
    }

    const { userId, newRole } = await request.json()

    if (!userId || !newRole) {
      return NextResponse.json({ error: 'userId y newRole son requeridos' }, { status: 400 })
    }

    const rolesValidos = ['admin', 'asesor', 'analista', 'campesino']
    if (!rolesValidos.includes(newRole)) {
      return NextResponse.json({ error: `Rol inválido. Válidos: ${rolesValidos.join(', ')}` }, { status: 400 })
    }

    // No permitir que el admin se cambie a sí mismo (previene quedar sin admin)
    if (userId === user.id) {
      return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

    // Actualizar profiles.rol
    const { error: updateErr } = await adminClient
      .from('profiles')
      .update({ rol: newRole })
      .eq('id', userId)

    if (updateErr) throw updateErr

    const rolLabel: Record<string, string> = {
      admin: 'Administrador', asesor: 'Asesor', analista: 'Analista', campesino: 'Agricultor'
    }
    return NextResponse.json({
      success: true,
      mensaje: `Rol actualizado a "${rolLabel[newRole] ?? newRole}" correctamente`,
    })
  } catch (err) {
    console.error('[ChangeRole] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
