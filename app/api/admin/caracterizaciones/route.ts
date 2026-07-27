import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

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

    const { searchParams } = new URL(request.url)
    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50')), 100)
    const search = (searchParams.get('search') || '').trim()
    const estado = (searchParams.get('estado') || '').trim()
    const skip   = (page - 1) * limit

    // ── Filtro por asesor ───────────────────────────────────────────────────
    let allowedVisitaIds: string[] | undefined
    if (rol === 'asesor') {
      const visitas = await prisma.visitas.findMany({
        where: { OR: [{ asesor_id: user.id }, { asesor_id: null }] },
        select: { id: true },
      })
      allowedVisitaIds = visitas.map(v => v.id)
      if (allowedVisitaIds.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, limit })
      }
    }

    // ── Búsqueda por texto ──────────────────────────────────────────────────
    let searchBenefIds: string[] | undefined
    let searchPredioIds: string[] | undefined
    let searchVisitaIds: string[] | undefined

    if (search) {
      const safe = search.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9 -]/g, '').trim()
      if (!safe) return NextResponse.json({ data: [], total: 0, page, limit })

      const [benefs, predios, visitasAsesor] = await Promise.all([
        prisma.beneficiarios.findMany({
          where: {
            OR: [
              { nombres:          { contains: safe, mode: 'insensitive' } },
              { apellidos:        { contains: safe, mode: 'insensitive' } },
              { numero_documento: { contains: safe, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        }),
        prisma.predios.findMany({
          where: {
            OR: [
              { nombre_predio: { contains: safe, mode: 'insensitive' } },
              { municipio:     { contains: safe, mode: 'insensitive' } },
              { vereda:        { contains: safe, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        }),
        // Buscar por nombre del asesor (nombre_tecnico en visitas)
        prisma.visitas.findMany({
          where: { nombre_tecnico: { contains: safe, mode: 'insensitive' } },
          select: { id: true },
        }),
      ])

      searchBenefIds  = benefs.map(b => b.id)
      searchPredioIds = predios.map(p => p.id)
      searchVisitaIds = visitasAsesor.map(v => v.id)

      // Si hay resultados de asesor, los añadimos a los OR
      if (searchBenefIds.length === 0 && searchPredioIds.length === 0 && (searchVisitaIds?.length ?? 0) === 0) {
        return NextResponse.json({ data: [], total: 0, page, limit })
      }
    }

    // ── Filtro sin_asesor ───────────────────────────────────────────────────
    let sinAsesorIds: string[] | undefined
    if (estado === 'sin_asesor') {
      const v = await prisma.visitas.findMany({
        where: { asesor_id: null },
        select: { id: true },
      })
      sinAsesorIds = v.map(x => x.id)
      if (sinAsesorIds.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, limit })
      }
    }

    const filterEstado = estado && estado !== 'todos' && estado !== 'sin_asesor' ? estado : undefined

    // ── WHERE principal ─────────────────────────────────────────────────────
    const where: Prisma.caracterizacionesWhereInput = {}

    if (allowedVisitaIds) where.id_visita = { in: allowedVisitaIds }
    if (sinAsesorIds)     where.id_visita = { in: sinAsesorIds }
    if (filterEstado)     where.estado    = { equals: filterEstado, mode: 'insensitive' }

    if (searchBenefIds !== undefined && searchPredioIds !== undefined) {
      const orClauses: Prisma.caracterizacionesWhereInput[] = []
      if (searchBenefIds.length  > 0) orClauses.push({ id_beneficiario: { in: searchBenefIds } })
      if (searchPredioIds.length > 0) orClauses.push({ id_predio:       { in: searchPredioIds } })
      if (searchVisitaIds && searchVisitaIds.length > 0) orClauses.push({ id_visita: { in: searchVisitaIds } })
      if (orClauses.length > 0) where.OR = orClauses
    }

    const include = {
      beneficiarios: { include: { informacion_financiera: true } },
      predios: {
        include: {
          caracterizacion_predio: true,
          area_productiva:        true,
          abastecimiento_agua:    true,
          riesgos_predio:         true,
        },
      },
      visitas: true,
      concepto_visita: true,
    } satisfies Prisma.caracterizacionesInclude

    const [data, total] = await Promise.all([
      prisma.caracterizaciones.findMany({ where, include, orderBy: { created_at: 'desc' }, skip, take: limit }),
      prisma.caracterizaciones.count({ where }),
    ])

    // ── Enriquecer con perfil del asesor ────────────────────────────────────
    const asesorIds = [...new Set(data.map(c => c.visitas?.asesor_id).filter((x): x is string => !!x))]
    const profilesMap: Record<string, { id: string; nombre_completo: string | null; email: string | null }> = {}
    if (asesorIds.length > 0) {
      const profiles = await prisma.profiles.findMany({
        where: { id: { in: asesorIds } },
        select: { id: true, nombre_completo: true, email: true },
      })
      for (const p of profiles) profilesMap[p.id] = p
    }

    const items = data.map(c => {
      const asesorProfile = c.visitas?.asesor_id ? (profilesMap[c.visitas.asesor_id] ?? null) : null
      // Renombrar relaciones Prisma (plural) a los nombres que usa el componente (singular)
      const { beneficiarios, predios, visitas, ...rest } = c
      return {
        ...rest,
        beneficiario:           beneficiarios ?? null,
        predio:                 predios ?? null,
        visita:                 visitas ?? null,
        caracterizacion_predio: predios?.caracterizacion_predio ?? null,
        area_productiva:        (predios?.area_productiva ?? [])[0] ?? null,
        abastecimiento_agua:    (predios?.abastecimiento_agua ?? [])[0] ?? null,
        riesgos_predio:         (predios?.riesgos_predio ?? [])[0] ?? null,
        informacion_financiera: (beneficiarios?.informacion_financiera ?? [])[0] ?? null,
        asesor:                 asesorProfile,
      }
    })

    return NextResponse.json({ data: items, total, page, limit })
  } catch (err) {
    console.error('[AdminCaracterizaciones] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
