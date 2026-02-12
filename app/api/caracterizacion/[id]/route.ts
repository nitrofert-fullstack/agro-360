import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Determinar si buscar por visita ID o por radicado
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    // 1. Obtener la visita
    let visitaQuery = supabase.from('visitas').select('*')
    if (isUUID) {
      visitaQuery = visitaQuery.eq('id', id)
    } else {
      visitaQuery = visitaQuery.or(`radicado_local.eq.${id},radicado_oficial.eq.${id}`)
    }
    const { data: visita, error: visitaErr } = await visitaQuery.single()

    if (visitaErr || !visita) {
      return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })
    }

    // 2. Obtener la caracterización principal
    const { data: carac } = await supabase
      .from('caracterizaciones')
      .select('*')
      .eq('id_visita', visita.id)
      .single()

    if (!carac) {
      return NextResponse.json({ error: 'Caracterización no encontrada' }, { status: 404 })
    }

    // 3. Obtener datos relacionados en paralelo
    const [
      { data: beneficiario },
      { data: predio },
    ] = await Promise.all([
      supabase.from('beneficiarios').select('*').eq('id', carac.id_beneficiario).single(),
      supabase.from('predios').select('*').eq('id', carac.id_predio).single(),
    ])

    // 4. Con el predio, obtener sub-tablas en paralelo
    let caracPredio = null
    let abastecimientoAgua = null
    let riesgosPredio = null
    let areaProductiva = null
    let infoFinanciera = null

    if (predio) {
      const [
        { data: cp },
        { data: aa },
        { data: rp },
        { data: ap },
      ] = await Promise.all([
        supabase.from('caracterizacion_predio').select('*').eq('id_predio', predio.id).single(),
        supabase.from('abastecimiento_agua').select('*').eq('id_predio', predio.id).single(),
        supabase.from('riesgos_predio').select('*').eq('id_predio', predio.id).single(),
        supabase.from('area_productiva').select('*').eq('id_predio', predio.id).single(),
      ])
      caracPredio = cp
      abastecimientoAgua = aa
      riesgosPredio = rp
      areaProductiva = ap
    }

    if (beneficiario) {
      const { data: fi } = await supabase
        .from('informacion_financiera')
        .select('*')
        .eq('id_beneficiario', beneficiario.id)
        .single()
      infoFinanciera = fi
    }

    return NextResponse.json({
      visita,
      caracterizacion: carac,
      beneficiario,
      predio,
      caracterizacionPredio: caracPredio,
      abastecimientoAgua,
      riesgosPredio,
      areaProductiva,
      infoFinanciera,
    })
  } catch (err) {
    console.error('[API] Error en caracterizacion/[id]:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
