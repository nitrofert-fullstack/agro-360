import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (!['admin', 'analista'].includes(profile?.rol || '')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch minimal data for stats (límite razonable; agregación en JS)
    const [
      { data: caracs },
      { data: predios },
      { data: beneficiarios },
      { data: visitas },
    ] = await Promise.all([
      supabaseAdmin.from('caracterizaciones').select('estado, created_at').limit(2000),
      supabaseAdmin.from('predios').select('municipio, departamento, area_total_hectareas').limit(2000),
      supabaseAdmin.from('beneficiarios').select('genero, edad, personas_a_cargo').limit(2000),
      supabaseAdmin.from('visitas').select('asesor_id, created_at').limit(2000),
    ])

    // By estado
    const porEstado: Record<string, number> = {}
    for (const c of caracs || []) {
      const key = (c.estado || 'INICIADO').toUpperCase()
      porEstado[key] = (porEstado[key] || 0) + 1
    }

    // By month — last 12
    const now = new Date()
    const porMes: { mes: string; total: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      porMes.push({ mes: key, total: 0 })
    }
    for (const c of caracs || []) {
      if (!c.created_at) continue
      const d = new Date(c.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const item = porMes.find(m => m.mes === key)
      if (item) item.total++
    }

    // By municipio — top 8
    const muniCount: Record<string, number> = {}
    for (const p of predios || []) {
      const key = p.municipio || 'Sin municipio'
      muniCount[key] = (muniCount[key] || 0) + 1
    }
    const porMunicipio = Object.entries(muniCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([municipio, total]) => ({ municipio, total }))

    // By departamento — top 6
    const deptCount: Record<string, number> = {}
    for (const p of predios || []) {
      const key = p.departamento || 'Sin departamento'
      deptCount[key] = (deptCount[key] || 0) + 1
    }
    const porDepartamento = Object.entries(deptCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([departamento, total]) => ({ departamento, total }))

    // By género
    const generoCount: Record<string, number> = {}
    for (const b of beneficiarios || []) {
      const key = b.genero || 'No especificado'
      generoCount[key] = (generoCount[key] || 0) + 1
    }
    const porGenero = Object.entries(generoCount).map(([genero, total]) => ({ genero, total }))

    // Promedios demográficos
    const edades = (beneficiarios || []).map(b => b.edad).filter((e): e is number => e != null)
    const personas = (beneficiarios || []).map(b => b.personas_a_cargo).filter((p): p is number => p != null)
    const hectareas = (predios || []).map(p => p.area_total_hectareas).filter((h): h is number => h != null)

    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null

    // Asignación de asesores
    const conAsesor = (visitas || []).filter(v => v.asesor_id).length
    const sinAsesor = (visitas || []).filter(v => !v.asesor_id).length

    const response = NextResponse.json({
      porEstado,
      porMes,
      porMunicipio,
      porDepartamento,
      porGenero,
      totalRegistros: caracs?.length || 0,
      promedios: {
        edad: avg(edades),
        personasACargo: avg(personas),
        hectareas: avg(hectareas),
      },
      asignacion: { conAsesor, sinAsesor },
    })
    // Cache 5 minutos en el browser y en CDN
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=60')
    return response
  } catch (err) {
    console.error('[Stats] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
