import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

type CountRow = { label: string | null; total: bigint | number }
type MonthRow = { month: Date; total: bigint | number }

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { rol: true },
    })

    if (!['admin', 'analista'].includes(profile?.rol ?? '')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)

    const [
      totalRegistros,
      estadoRows,
      municipioRows,
      departamentoRows,
      generoRows,
      promedios,
      totalPredios,
      totalBeneficiarios,
      conAsesor,
      sinAsesor,
      asesorCountRows,
      asesoresProfiles,
      porMesRows,
    ] = await Promise.all([
      prisma.caracterizaciones.count(),
      prisma.caracterizaciones.groupBy({
        by: ['estado'],
        _count: { _all: true },
      }),
      prisma.predios.groupBy({
        by: ['municipio'],
        _count: { _all: true },
        orderBy: { _count: { municipio: 'desc' } },
        take: 8,
      }),
      prisma.predios.groupBy({
        by: ['departamento'],
        _count: { _all: true },
        orderBy: { _count: { departamento: 'desc' } },
        take: 6,
      }),
      prisma.beneficiarios.groupBy({
        by: ['genero'],
        _count: { _all: true },
      }),
      prisma.$queryRaw<Array<{ edad: number | null; personas_a_cargo: number | null; hectareas: number | null }>>(
        Prisma.sql`
          select
            (select avg(edad)::float8 from beneficiarios where edad is not null) as edad,
            (select avg(personas_a_cargo)::float8 from beneficiarios where personas_a_cargo is not null) as personas_a_cargo,
            (select avg(area_total_hectareas)::float8 from predios where area_total_hectareas is not null) as hectareas
        `
      ),
      prisma.predios.count(),
      prisma.beneficiarios.count(),
      prisma.visitas.count({ where: { asesor_id: { not: null } } }),
      prisma.visitas.count({ where: { asesor_id: null } }),
      prisma.visitas.groupBy({
        by: ['asesor_id'],
        _count: { _all: true },
      }),
      prisma.profiles.findMany({
        where: { rol: { in: ['asesor', 'admin'] }, activo: true },
        select: { id: true, nombre_completo: true, rol: true },
      }),
      prisma.$queryRaw<MonthRow[]>(Prisma.sql`
        select
          date_trunc('month', created_at)::date as month,
          count(*)::bigint as total
        from caracterizaciones
        where created_at >= ${monthStart}
        group by 1
        order by 1 asc
      `),
    ])

    const toNumber = (value: bigint | number | null | undefined) => Number(value ?? 0)
    const round = (value: number | null | undefined) =>
      value == null || Number.isNaN(value) ? null : Math.round(value * 10) / 10

    const porEstado = Object.fromEntries(
      estadoRows.map((row) => [
        (row.estado || 'INICIADO').toUpperCase(),
        row._count._all,
      ])
    )

    // Por mes — últimos 12
    const porMes: { mes: string; total: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      porMes.push({ mes: key, total: 0 })
    }
    for (const row of porMesRows) {
      const d = new Date(row.month)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const item = porMes.find(m => m.mes === key)
      if (item) item.total = toNumber(row.total)
    }

    const porMunicipio = municipioRows.map((row) => ({
      municipio: row.municipio || 'Sin municipio',
      total: row._count._all,
    }))

    const porDepartamento = departamentoRows.map((row) => ({
      departamento: row.departamento || 'Sin departamento',
      total: row._count._all,
    }))

    const porGenero = generoRows.map((row) => ({
      genero: row.genero || 'No especificado',
      total: row._count._all,
    }))

    // Por asesor — conteo de visitas por asesor_id, con nombre del perfil
    const profileMap = new Map(asesoresProfiles.map(p => [p.id, p.nombre_completo || 'Sin nombre']))
    const porAsesor = asesorCountRows
      .map((row) => ({
        nombre: row.asesor_id ? (profileMap.get(row.asesor_id) || 'Asesor desconocido') : 'Sin asesor',
        total: row._count._all,
      }))
      .sort((a, b) => b.total - a.total)

    const promedioRow = promedios[0] ?? { edad: null, personas_a_cargo: null, hectareas: null }

    const response = NextResponse.json({
      porEstado,
      porMes,
      porMunicipio,
      porDepartamento,
      porGenero,
      porAsesor,
      totalRegistros,
      promedios: {
        edad:          round(promedioRow.edad),
        personasACargo: round(promedioRow.personas_a_cargo),
        hectareas:     round(promedioRow.hectareas),
      },
      totales: {
        predios: totalPredios,
        beneficiarios: totalBeneficiarios,
      },
      asignacion: { conAsesor, sinAsesor },
    })
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
