import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const SELECT_QUERY = `
  *,
  beneficiario:beneficiarios(*, informacion_financiera(*)),
  predio:predios(*, caracterizacion_predio(*), area_productiva(*)),
  visita:visitas(*, asesor:profiles(id, nombre_completo, email))
`

export async function GET() {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener rol del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    const rol = profile?.rol
    if (rol !== 'admin' && rol !== 'asesor') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
    }

    // Usamos el cliente admin para bypassear RLS y controlar el filtro manualmente
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

    let query = adminClient
      .from('caracterizaciones')
      .select(SELECT_QUERY)
      .order('created_at', { ascending: false })

    if (rol === 'asesor') {
      // El asesor solo ve sus propios registros + los sin asesor asignado
      const { data: visitas } = await adminClient
        .from('visitas')
        .select('id')
        .or(`asesor_id.eq.${user.id},asesor_id.is.null`)

      const visitaIds = (visitas || []).map((v: { id: string }) => v.id)

      if (visitaIds.length === 0) {
        // Sin registros para este asesor
        return NextResponse.json({ data: [] })
      }

      query = query.in('id_visita', visitaIds) as typeof query
    }
    // Si es admin, no se aplica ningún filtro — ve todo

    const { data, error } = await query

    if (error) throw error

    // Aplanar relaciones anidadas igual que el componente actual
    const items = (data || []).map((c: any) => {
      const asesorProfile = c.visita?.asesor ?? null
      return {
        ...c,
        caracterizacion_predio: c.predio?.caracterizacion_predio?.[0] ?? null,
        area_productiva: c.predio?.area_productiva?.[0] ?? null,
        informacion_financiera: c.beneficiario?.informacion_financiera?.[0] ?? null,
        asesor: asesorProfile,
        // Exponer asesor_id en visita para que el componente pueda detectar registros sin asesor
        visita: c.visita
          ? { ...c.visita, asesor: undefined }
          : null,
      }
    })

    return NextResponse.json({ data: items })
  } catch (err) {
    console.error('[AdminCaracterizaciones] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
