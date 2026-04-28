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
      where:  { id: userId },
      select: { rol: true, email: true, nombre_completo: true },
    })

    if (!targetProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (targetProfile.rol === 'admin') {
      return NextResponse.json({ error: 'No se puede eliminar a un administrador' }, { status: 400 })
    }

    // ── 1. Desasociar visitas del asesor ────────────────────────────────────
    await prisma.visitas.updateMany({
      where: { asesor_id: userId },
      data:  { asesor_id: null },
    })

    // ── 2. Eliminar invitaciones ────────────────────────────────────────────
    await prisma.invitations.deleteMany({ where: { invitado_por: userId } })
    if (targetProfile.email) {
      await prisma.invitations.deleteMany({ where: { email: targetProfile.email } })
    }

    // ── 3. Eliminar perfil ──────────────────────────────────────────────────
    await prisma.profiles.delete({ where: { id: userId } })

    // ── 4. Eliminar de auth.users (Supabase Auth — no manejado por Prisma) ──
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

    return NextResponse.json({
      success: true,
      mensaje: `Usuario ${targetProfile.email || targetProfile.nombre_completo} eliminado correctamente`,
    })
  } catch (err) {
    console.error('[DeleteUser] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
