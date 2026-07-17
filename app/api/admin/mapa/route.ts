import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Devuelve TODOS los predios con coordenadas en una sola query ligera, para el
// mapa. Antes el mapa usaba /api/admin/caracterizaciones (paginado a 50) → solo
// mostraba unos pocos marcadores. Aquí no hay paginación: el mapa los necesita
// todos. lat/lng se castean a float8 (en BD son Decimal → llegarían como string).
export async function GET(request: Request) {
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
    const rol = profile?.rol
    if (!['admin', 'asesor', 'analista'].includes(rol ?? '')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Tipo de ubicación: reales (con GPS capturado) | aproximadas (punto por
    // defecto = sin GPS real) | todos.
    const { searchParams } = new URL(request.url)
    const tipo = (searchParams.get('tipo') || 'reales').toLowerCase()
    const DEFAULT_POINT = Prisma.sql`(round(p.latitud::numeric, 4) = 7.1254 and round(p.longitud::numeric, 4) = -73.1198)`
    const tipoClause =
      tipo === 'aproximadas'
        ? Prisma.sql`and ${DEFAULT_POINT}`
        : tipo === 'todos'
          ? Prisma.empty
          : Prisma.sql`and not ${DEFAULT_POINT}`

    // El asesor solo ve los predios de sus caracterizaciones (o sin asesor asignado)
    const asesorFilter =
      rol === 'asesor'
        ? Prisma.sql`
            and p.id in (
              select c.id_predio
              from caracterizaciones c
              join visitas v on v.id = c.id_visita
              where v.asesor_id = ${user.id}::uuid or v.asesor_id is null
            )`
        : Prisma.empty

    const rows = await prisma.$queryRaw<Array<{
      id: string
      nombre_predio: string | null
      municipio: string | null
      vereda: string | null
      latitud: number | null
      longitud: number | null
      area_total_hectareas: number | null
      area_productiva_hectareas: number | null
      poligono: unknown
      nombres: string | null
      apellidos: string | null
      temperatura_celsius: number | null
      aproximada: boolean
    }>>(Prisma.sql`
      select
        p.id,
        p.nombre_predio,
        p.municipio,
        p.vereda,
        p.latitud::float8  as latitud,
        p.longitud::float8 as longitud,
        p.area_total_hectareas::float8      as area_total_hectareas,
        p.area_productiva_hectareas::float8 as area_productiva_hectareas,
        p.poligono,
        b.nombres,
        b.apellidos,
        cp.temperatura_celsius::float8 as temperatura_celsius,
        ${DEFAULT_POINT} as aproximada
      from predios p
      left join lateral (
        select c.id_beneficiario
        from caracterizaciones c
        where c.id_predio = p.id
        order by c.created_at desc nulls last
        limit 1
      ) lc on true
      left join beneficiarios b on b.id = lc.id_beneficiario
      left join caracterizacion_predio cp on cp.id_predio = p.id
      where p.latitud is not null and p.longitud is not null
      ${tipoClause}
      ${asesorFilter}
    `)

    // Forma compatible con los consumidores (leen c.predio / c.beneficiario / c.caracterizacion_predio)
    const data = rows.map((r) => ({
      predio: {
        id: r.id,
        nombre_predio: r.nombre_predio,
        municipio: r.municipio,
        vereda: r.vereda,
        latitud: r.latitud,
        longitud: r.longitud,
        area_total_hectareas: r.area_total_hectareas,
        area_productiva_hectareas: r.area_productiva_hectareas,
        poligono: r.poligono,
      },
      beneficiario: r.nombres || r.apellidos ? { nombres: r.nombres, apellidos: r.apellidos } : null,
      caracterizacion_predio: r.temperatura_celsius != null ? { temperatura_celsius: r.temperatura_celsius } : null,
      aproximada: r.aproximada,
    }))

    const response = NextResponse.json({ data, total: data.length })
    response.headers.set('Cache-Control', 'private, max-age=120')
    return response
  } catch (err) {
    console.error('[Mapa] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
