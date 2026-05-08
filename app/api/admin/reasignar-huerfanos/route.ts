import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const adminProfile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { rol: true },
    })
    if (adminProfile?.rol !== 'admin') return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })

    // Obtener todos los asesores activos con su carga actual
    const asesores = await prisma.profiles.findMany({
      where: { rol: 'asesor', activo: true },
      select: { id: true, nombre_completo: true },
    })

    if (asesores.length === 0) {
      return NextResponse.json({ error: 'No hay asesores activos disponibles' }, { status: 400 })
    }

    // Obtener nombres actuales de asesores activos
    const nombresActuales = new Set(
      asesores.map(a => a.nombre_completo?.trim()).filter(Boolean)
    )

    // Visitas con nombre_tecnico que NO corresponde a ningún asesor activo,
    // o con asesor_id nulo, o donde el nombre_tecnico no coincide con el asesor asignado
    const visitasDesactualizadas = await prisma.visitas.findMany({
      where: {
        OR: [
          // nombre_tecnico no es de ningún asesor activo
          { nombre_tecnico: { notIn: [...nombresActuales] as string[] } },
          // sin asesor asignado
          { asesor_id: null },
        ],
      },
      select: { id: true, asesor_id: true, nombre_tecnico: true },
    })

    if (visitasDesactualizadas.length === 0) {
      return NextResponse.json({ mensaje: 'Todos los registros ya tienen asesor actualizado.', actualizadas: 0 })
    }

    // Calcular carga actual de cada asesor
    const cargas = await Promise.all(
      asesores.map(async (a) => ({
        ...a,
        carga: await prisma.visitas.count({ where: { asesor_id: a.id } }),
      }))
    )

    let actualizadas = 0

    // Asignar cada visita al asesor con menor carga (balanceo dinámico)
    for (const visita of visitasDesactualizadas) {
      const destino = cargas.reduce((min, curr) => curr.carga < min.carga ? curr : min)

      await prisma.visitas.update({
        where: { id: visita.id },
        data: {
          asesor_id: destino.id,
          nombre_tecnico: destino.nombre_completo ?? undefined,
        },
      })

      // Incrementar carga local para balanceo correcto en el loop
      destino.carga++
      actualizadas++
    }

    return NextResponse.json({
      success: true,
      mensaje: `${actualizadas} registro${actualizadas !== 1 ? 's' : ''} reasignado${actualizadas !== 1 ? 's' : ''} correctamente.`,
      actualizadas,
    })
  } catch (err) {
    console.error('[ReasignarHuerfanos]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 })
  }
}
