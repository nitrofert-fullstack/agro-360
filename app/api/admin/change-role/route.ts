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
      return NextResponse.json({ error: 'Solo administradores pueden cambiar roles' }, { status: 403 })
    }

    const { userId, newRole } = await request.json()

    if (!userId || !newRole) {
      return NextResponse.json({ error: 'userId y newRole son requeridos' }, { status: 400 })
    }

    const rolesValidos = ['admin', 'asesor', 'analista', 'agricultor']
    if (!rolesValidos.includes(newRole)) {
      return NextResponse.json({ error: `Rol inválido. Válidos: ${rolesValidos.join(', ')}` }, { status: 400 })
    }

    if (userId === user.id) {
      return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 })
    }

    const targetProfile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: { rol: true, nombre_completo: true },
    })

    const rolAnterior = targetProfile?.rol

    // ── Si era asesor y deja de serlo → reasignar sus visitas ───────────────
    let reasignacion: { cantidad: number; asesorNombre: string | null } | null = null

    if (rolAnterior === 'asesor' && newRole !== 'asesor') {
      const visitasCount = await prisma.visitas.count({
        where: { asesor_id: userId },
      })

      if (visitasCount > 0) {
        // Buscar asesores activos restantes (excluir al usuario que cambia de rol)
        const asesoresActivos = await prisma.profiles.findMany({
          where: {
            id: { not: userId },
            rol: 'asesor',
            activo: true,
          },
          select: { id: true, nombre_completo: true },
        })

        if (asesoresActivos.length > 0) {
          // Encontrar el de menor carga
          const cargas = await Promise.all(
            asesoresActivos.map(async (a) => ({
              id: a.id,
              nombre: a.nombre_completo,
              carga: await prisma.visitas.count({ where: { asesor_id: a.id } }),
            }))
          )

          const destino = cargas.reduce((min, curr) =>
            curr.carga < min.carga ? curr : min
          )

          await prisma.visitas.updateMany({
            where: { asesor_id: userId },
            data: {
              asesor_id: destino.id,
              nombre_tecnico: destino.nombre ?? undefined,
            },
          })

          reasignacion = { cantidad: visitasCount, asesorNombre: destino.nombre }
        } else {
          // Sin otros asesores — dejar sin asignar, limpiar nombre
          await prisma.visitas.updateMany({
            where: { asesor_id: userId },
            data: { asesor_id: null, nombre_tecnico: undefined },
          })
          reasignacion = { cantidad: visitasCount, asesorNombre: null }
        }
      }
    }

    // ── Actualizar rol ──────────────────────────────────────────────────────
    await prisma.profiles.update({
      where: { id: userId },
      data: { rol: newRole, updated_at: new Date() },
    })

    // Sync user_metadata en auth.users
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { rol: newRole },
    })

    const rolLabel: Record<string, string> = {
      admin: 'Administrador', asesor: 'Asesor', analista: 'Analista', agricultor: 'Agricultor',
    }

    let mensaje = `Rol actualizado a "${rolLabel[newRole] ?? newRole}" correctamente.`
    if (reasignacion) {
      if (reasignacion.asesorNombre) {
        mensaje += ` ${reasignacion.cantidad} caracterización${reasignacion.cantidad !== 1 ? 'es' : ''} reasignada${reasignacion.cantidad !== 1 ? 's' : ''} a ${reasignacion.asesorNombre}.`
      } else {
        mensaje += ` ${reasignacion.cantidad} caracterización${reasignacion.cantidad !== 1 ? 'es' : ''} quedaron sin asesor asignado (no hay otros asesores activos).`
      }
    }

    return NextResponse.json({ success: true, mensaje, reasignacion })
  } catch (err) {
    console.error('[ChangeRole] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
