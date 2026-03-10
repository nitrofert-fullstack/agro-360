import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

    // Obtener el rol del usuario para verificar acceso
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('rol, numero_documento')
      .eq('id', user.id)
      .single()

    // Determinar si buscar por visita ID o por radicado
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    // 1. Obtener la visita
    let visita: any = null
    let visitaErr: any = null
    if (isUUID) {
      const res = await supabase.from('visitas').select('*').eq('id', id).single()
      visita = res.data; visitaErr = res.error
    } else {
      // Buscar primero por radicado_oficial, luego por radicado_local
      const byOficial = await supabase.from('visitas').select('*').eq('radicado_oficial', id).maybeSingle()
      if (byOficial.data) {
        visita = byOficial.data; visitaErr = null
      } else {
        const byLocal = await supabase.from('visitas').select('*').eq('radicado_local', id).maybeSingle()
        visita = byLocal.data; visitaErr = byLocal.data ? null : (byLocal.error ?? { message: 'No encontrado' })
      }
    }

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

    // Verificar acceso según rol: campesino solo puede ver su propia caracterización
    if (userProfile?.rol === 'campesino') {
      const numDoc = (userProfile as any).numero_documento
      if (numDoc) {
        const { data: ownBenef } = await supabase
          .from('beneficiarios')
          .select('id')
          .eq('numero_documento', numDoc)
          .maybeSingle()
        if (!ownBenef || ownBenef.id !== carac.id_beneficiario) {
          return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
        }
      } else {
        // Fallback: verificar por correo
        const { data: ownBenef } = await supabase
          .from('beneficiarios')
          .select('id')
          .eq('correo', user.email)
          .maybeSingle()
        if (!ownBenef || ownBenef.id !== carac.id_beneficiario) {
          return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
        }
      }
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
      // Usar admin client para evitar problemas de RLS en informacion_financiera
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: fiRows } = await supabaseAdmin
        .from('informacion_financiera')
        .select('*')
        .eq('id_beneficiario', beneficiario.id)
        .order('created_at', { ascending: false })
        .limit(1)
      infoFinanciera = fiRows?.[0] ?? null
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
