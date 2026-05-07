import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

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

    const [caracs, predios, beneficiarios, visitas, asesoresProfiles] = await Promise.all([
      prisma.caracterizaciones.findMany({
        select: { estado: true, created_at: true },
        take: 2000,
      }),
      prisma.predios.findMany({
        select: { municipio: true, departamento: true, area_total_hectareas: true },
        take: 2000,
      }),
      prisma.beneficiarios.findMany({
        select: { genero: true, edad: true, personas_a_cargo: true },
        take: 2000,
      }),
      prisma.visitas.findMany({
        select: { asesor_id: true, created_at: true },
        take: 2000,
      }),
      prisma.profiles.findMany({
        where: { rol: { in: ['asesor', 'admin'] }, activo: true },
        select: { id: true, nombre_completo: true, rol: true },
      }),
    ])

    // Por estado
    const porEstado: Record<string, number> = {}
    for (const c of caracs) {
      const key = (c.estado || 'INICIADO').toUpperCase()
      porEstado[key] = (porEstado[key] || 0) + 1
    }

    // Por mes — últimos 12
    const now = new Date()
    const porMes: { mes: string; total: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      porMes.push({ mes: key, total: 0 })
    }
    for (const c of caracs) {
      if (!c.created_at) continue
      const d = new Date(c.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const item = porMes.find(m => m.mes === key)
      if (item) item.total++
    }

    // Por municipio — top 8
    const muniCount: Record<string, number> = {}
    for (const p of predios) {
      const key = p.municipio || 'Sin municipio'
      muniCount[key] = (muniCount[key] || 0) + 1
    }
    const porMunicipio = Object.entries(muniCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([municipio, total]) => ({ municipio, total }))

    // Por departamento — top 6
    const deptCount: Record<string, number> = {}
    for (const p of predios) {
      const key = p.departamento || 'Sin departamento'
      deptCount[key] = (deptCount[key] || 0) + 1
    }
    const porDepartamento = Object.entries(deptCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([departamento, total]) => ({ departamento, total }))

    // Por género
    const generoCount: Record<string, number> = {}
    for (const b of beneficiarios) {
      const key = b.genero || 'No especificado'
      generoCount[key] = (generoCount[key] || 0) + 1
    }
    const porGenero = Object.entries(generoCount).map(([genero, total]) => ({ genero, total }))

    // Promedios
    const edades    = beneficiarios.map(b => b.edad).filter((e): e is number => e != null)
    const personas  = beneficiarios.map(b => b.personas_a_cargo).filter((p): p is number => p != null)
    const hectareas = predios.map(p => Number(p.area_total_hectareas)).filter((h): h is number => !isNaN(h) && h != null)

    const avg = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null

    const conAsesor = visitas.filter(v => v.asesor_id).length
    const sinAsesor = visitas.filter(v => !v.asesor_id).length

    // Por asesor — conteo de visitas por asesor_id, con nombre del perfil
    const asesorCount: Record<string, number> = {}
    for (const v of visitas) {
      const key = v.asesor_id || '__sin_asesor__'
      asesorCount[key] = (asesorCount[key] || 0) + 1
    }
    const profileMap = new Map(asesoresProfiles.map(p => [p.id, p.nombre_completo || 'Sin nombre']))
    const porAsesor = Object.entries(asesorCount)
      .map(([id, total]) => ({
        nombre: id === '__sin_asesor__' ? 'Sin asesor' : (profileMap.get(id) || 'Asesor desconocido'),
        total,
      }))
      .sort((a, b) => b.total - a.total)

    const response = NextResponse.json({
      porEstado,
      porMes,
      porMunicipio,
      porDepartamento,
      porGenero,
      porAsesor,
      totalRegistros: caracs.length,
      promedios: {
        edad:          avg(edades),
        personasACargo: avg(personas),
        hectareas:     avg(hectareas),
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
