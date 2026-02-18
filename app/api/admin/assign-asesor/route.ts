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
      return NextResponse.json({ error: 'Solo administradores pueden asignar asesores' }, { status: 403 })
    }

    const { visitaId, asesorId } = await request.json()

    if (!visitaId || !asesorId) {
      return NextResponse.json({ error: 'visitaId y asesorId son requeridos' }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

    // Verificar que el asesor asignado exista y sea asesor/admin
    const { data: asesorProfile } = await adminClient
      .from('profiles')
      .select('id, nombre_completo, rol')
      .eq('id', asesorId)
      .single()

    if (!asesorProfile) {
      return NextResponse.json({ error: 'Asesor no encontrado' }, { status: 404 })
    }

    if (!['asesor', 'admin'].includes(asesorProfile.rol)) {
      return NextResponse.json({ error: 'El usuario seleccionado no es asesor ni admin' }, { status: 400 })
    }

    // Actualizar asesor_id en visitas
    const { error: updateErr } = await adminClient
      .from('visitas')
      .update({ asesor_id: asesorId })
      .eq('id', visitaId)

    if (updateErr) throw updateErr

    return NextResponse.json({
      success: true,
      mensaje: `Asesor "${asesorProfile.nombre_completo}" asignado correctamente`,
    })
  } catch (err) {
    console.error('[AssignAsesor] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
