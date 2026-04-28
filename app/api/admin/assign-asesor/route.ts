import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const adminProfile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { rol: true },
    })

    if (adminProfile?.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden asignar asesores' }, { status: 403 })
    }

    const { visitaId, asesorId } = await request.json()

    if (!visitaId || !asesorId) {
      return NextResponse.json({ error: 'visitaId y asesorId son requeridos' }, { status: 400 })
    }

    const asesorProfile = await prisma.profiles.findUnique({
      where:  { id: asesorId },
      select: { id: true, nombre_completo: true, rol: true },
    })

    if (!asesorProfile) {
      return NextResponse.json({ error: 'Asesor no encontrado' }, { status: 404 })
    }

    if (!['asesor', 'admin'].includes(asesorProfile.rol ?? '')) {
      return NextResponse.json({ error: 'El usuario seleccionado no es asesor ni admin' }, { status: 400 })
    }

    await prisma.visitas.update({
      where: { id: visitaId },
      data:  { asesor_id: asesorId, updated_at: new Date() },
    })

    return NextResponse.json({
      success: true,
      mensaje: `Asesor "${asesorProfile.nombre_completo}" asignado correctamente`,
    })
  } catch (err) {
    console.error('[AssignAsesor] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
