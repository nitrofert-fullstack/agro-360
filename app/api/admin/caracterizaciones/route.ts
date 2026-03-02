import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const SELECT_QUERY = `
  *,
  beneficiario:beneficiarios(*, informacion_financiera(*)),
  predio:predios(*, caracterizacion_predio(*), area_productiva(*)),
  visita:visitas(*)
`

export async function GET(request: Request) {
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
    if (!['admin', 'asesor', 'analista'].includes(rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
    }

    // Params de paginación y filtros
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50')), 100)
    const search = (searchParams.get('search') || '').trim()
    const estado = (searchParams.get('estado') || '').trim()
    const offset = (page - 1) * limit

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

    // Construir conjunto de ids de visitas permitidas para el asesor
    let allowedVisitaIds: string[] | null = null
    if (rol === 'asesor') {
      const { data: visitas } = await adminClient
        .from('visitas')
        .select('id')
        .or(`asesor_id.eq.${user.id},asesor_id.is.null`)

      allowedVisitaIds = (visitas || []).map((v: { id: string }) => v.id)
      if (allowedVisitaIds.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, limit })
      }
    }

    // --- Resolver IDs de beneficiarios/predios que coinciden con la búsqueda ---
    let searchBenefIds: string[] | null = null
    let searchPredioIds: string[] | null = null

    if (search) {
      const [benefResult, predioResult] = await Promise.all([
        adminClient
          .from('beneficiarios')
          .select('id')
          .or(`nombres.ilike.%${search}%,apellidos.ilike.%${search}%,numero_documento.ilike.%${search}%`),
        adminClient
          .from('predios')
          .select('id')
          .or(`nombre_predio.ilike.%${search}%,municipio.ilike.%${search}%,vereda.ilike.%${search}%`),
      ])
      searchBenefIds = (benefResult.data || []).map((b: { id: string }) => b.id)
      searchPredioIds = (predioResult.data || []).map((p: { id: string }) => p.id)

      // Si no hay resultados en ninguna tabla, devolver vacío
      if (searchBenefIds.length === 0 && searchPredioIds.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, limit })
      }
    }

    // --- Resolver IDs de visitas que coinciden con el filtro de estado ---
    let estadoVisitaIds: string[] | null = null
    if (estado && estado !== 'todos' && estado !== 'sin_asesor') {
      const { data: visitasEstado } = await adminClient
        .from('visitas')
        .select('id')
        .ilike('estado', estado)
      estadoVisitaIds = (visitasEstado || []).map((v: { id: string }) => v.id)
      if (estadoVisitaIds.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, limit })
      }
    }

    // --- Construir query principal ---
    let query = adminClient
      .from('caracterizaciones')
      .select(SELECT_QUERY, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Filtro por asesor (solo sus registros)
    if (allowedVisitaIds !== null) {
      query = query.in('id_visita', allowedVisitaIds) as typeof query
    }

    // Filtro por búsqueda (beneficiario OR predio)
    if (searchBenefIds !== null && searchPredioIds !== null) {
      const allMatchIds = [...new Set([...searchBenefIds, ...searchPredioIds])]
      if (searchBenefIds.length > 0 && searchPredioIds.length > 0) {
        query = query.or(`id_beneficiario.in.(${searchBenefIds.join(',')}),id_predio.in.(${searchPredioIds.join(',')})`) as typeof query
      } else if (searchBenefIds.length > 0) {
        query = query.in('id_beneficiario', searchBenefIds) as typeof query
      } else {
        query = query.in('id_predio', searchPredioIds) as typeof query
      }
    }

    // Filtro por estado (vía visitas)
    if (estadoVisitaIds !== null) {
      query = query.in('id_visita', estadoVisitaIds) as typeof query
    }

    // Filtro "sin_asesor" — visitas con asesor_id null
    if (estado === 'sin_asesor') {
      const { data: sinAsesorVisitas } = await adminClient
        .from('visitas')
        .select('id')
        .is('asesor_id', null)
      const sinAsesorIds = (sinAsesorVisitas || []).map((v: { id: string }) => v.id)
      if (sinAsesorIds.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, limit })
      }
      query = query.in('id_visita', sinAsesorIds) as typeof query
    }

    // Paginación
    query = query.range(offset, offset + limit - 1) as typeof query

    const { data, error, count } = await query

    if (error) throw error

    // Obtener profiles de los asesores referenciados en visitas
    const asesorIds = [...new Set(
      (data || []).map((c: any) => c.visita?.asesor_id).filter(Boolean)
    )]

    let profilesMap: Record<string, { id: string; nombre_completo: string; email: string }> = {}
    if (asesorIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, nombre_completo, email')
        .in('id', asesorIds)
      for (const p of profiles || []) {
        profilesMap[p.id] = p
      }
    }

    const items = (data || []).map((c: any) => {
      const asesorProfile = c.visita?.asesor_id ? (profilesMap[c.visita.asesor_id] ?? null) : null
      return {
        ...c,
        caracterizacion_predio: c.predio?.caracterizacion_predio?.[0] ?? null,
        area_productiva: c.predio?.area_productiva?.[0] ?? null,
        informacion_financiera: c.beneficiario?.informacion_financiera?.[0] ?? null,
        asesor: asesorProfile,
        visita: c.visita ?? null,
      }
    })

    return NextResponse.json({ data: items, total: count ?? 0, page, limit })
  } catch (err) {
    console.error('[AdminCaracterizaciones] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
