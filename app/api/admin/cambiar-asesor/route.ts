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
    if (!['admin', 'analista'].includes(adminProfile?.rol ?? ''))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { visitaId, asesorId } = await request.json()
    if (!visitaId || !asesorId) return NextResponse.json({ error: 'visitaId y asesorId requeridos' }, { status: 400 })

    const asesor = await prisma.profiles.findUnique({
      where: { id: asesorId },
      select: { nombre_completo: true, rol: true },
    })
    if (!asesor || asesor.rol !== 'asesor')
      return NextResponse.json({ error: 'El usuario seleccionado no es asesor' }, { status: 400 })

    await prisma.visitas.update({
      where: { id: visitaId },
      data: {
        asesor_id: asesorId,
        nombre_tecnico: asesor.nombre_completo ?? undefined,
      },
    })

    return NextResponse.json({ success: true, mensaje: `Asesor actualizado a ${asesor.nombre_completo}` })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 })
  }
}
