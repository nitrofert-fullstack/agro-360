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

    await prisma.profiles.update({
      where: { id: userId },
      data:  { rol: newRole, updated_at: new Date() },
    })

    // Sync user_metadata en auth.users (Supabase Auth no lo maneja Prisma)
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
    return NextResponse.json({
      success: true,
      mensaje: `Rol actualizado a "${rolLabel[newRole] ?? newRole}" correctamente`,
    })
  } catch (err) {
    console.error('[ChangeRole] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
