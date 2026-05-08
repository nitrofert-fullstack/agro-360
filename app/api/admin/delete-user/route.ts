import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
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
      return NextResponse.json({ error: 'Solo administradores pueden eliminar cuentas' }, { status: 403 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 })
    }

    if (userId === user.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
    }

    const targetProfile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: { rol: true, email: true, nombre_completo: true },
    })

    if (!targetProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (targetProfile.rol === 'admin') {
      return NextResponse.json({ error: 'No se puede eliminar a un administrador' }, { status: 400 })
    }

    // ── 1. Contar visitas asignadas al asesor ────────────────────────────────
    const visitasCount = await prisma.visitas.count({
      where: { asesor_id: userId },
    })

    let reasignadoA: string | null = null
    let reasignadoNombre: string | null = null

    if (visitasCount > 0) {
      // ── 2. Buscar todos los asesores activos (excluir al que se elimina) ──
      const asesoresActivos = await prisma.profiles.findMany({
        where: {
          id: { not: userId },
          rol: { in: ['asesor'] },
          activo: true,
        },
        select: { id: true, nombre_completo: true },
      })

      if (asesoresActivos.length > 0) {
        // ── 3. Contar carga de cada asesor activo ──────────────────────────
        const cargas = await Promise.all(
          asesoresActivos.map(async (a) => ({
            id: a.id,
            nombre: a.nombre_completo,
            carga: await prisma.visitas.count({ where: { asesor_id: a.id } }),
          }))
        )

        // ── 4. Elegir el de menor carga ────────────────────────────────────
        const asesorDestino = cargas.reduce((min, curr) =>
          curr.carga < min.carga ? curr : min
        )

        // ── 5. Reasignar visitas y actualizar nombre_tecnico ──────────────
        await prisma.visitas.updateMany({
          where: { asesor_id: userId },
          data: {
            asesor_id: asesorDestino.id,
            nombre_tecnico: asesorDestino.nombre ?? undefined,
          },
        })

        reasignadoA = asesorDestino.id
        reasignadoNombre = asesorDestino.nombre
      } else {
        // No hay otros asesores — dejar sin asignar y limpiar nombre
        await prisma.visitas.updateMany({
          where: { asesor_id: userId },
          data: { asesor_id: null, nombre_tecnico: undefined },
        })
      }
    }

    // ── 6. Eliminar invitaciones ────────────────────────────────────────────
    await prisma.invitations.deleteMany({ where: { invitado_por: userId } })
    if (targetProfile.email) {
      await prisma.invitations.deleteMany({ where: { email: targetProfile.email } })
    }

    // ── 7. Eliminar perfil ──────────────────────────────────────────────────
    await prisma.profiles.delete({ where: { id: userId } })

    // ── 8. Eliminar de auth.users ───────────────────────────────────────────
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteErr) {
      return NextResponse.json(
        { error: `Error eliminando usuario de auth: ${authDeleteErr.message}` },
        { status: 500 }
      )
    }

    // ── 9. Construir mensaje de respuesta ───────────────────────────────────
    let mensaje = `Usuario ${targetProfile.email || targetProfile.nombre_completo} eliminado correctamente.`
    if (visitasCount > 0) {
      if (reasignadoNombre) {
        mensaje += ` ${visitasCount} caracterización${visitasCount !== 1 ? 'es' : ''} reasignada${visitasCount !== 1 ? 's' : ''} a ${reasignadoNombre}.`
      } else {
        mensaje += ` ${visitasCount} caracterización${visitasCount !== 1 ? 'es' : ''} quedaron sin asesor asignado (no hay otros asesores activos).`
      }
    }

    return NextResponse.json({
      success: true,
      mensaje,
      reasignacion: visitasCount > 0 ? {
        cantidad: visitasCount,
        asesorNombre: reasignadoNombre,
        asesorId: reasignadoA,
      } : null,
    })
  } catch (err) {
    console.error('[DeleteUser] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
