import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar que el solicitante sea admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

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

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Configuración de servidor incompleta' }, { status: 500 })
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey)

    // Obtener datos del usuario a eliminar (necesitamos el email para limpiar invitations)
    const { data: targetProfile, error: profileFetchErr } = await supabaseAdmin
      .from('profiles')
      .select('rol, email, nombre_completo')
      .eq('id', userId)
      .single()

    if (profileFetchErr || !targetProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (targetProfile.rol === 'admin') {
      return NextResponse.json({ error: 'No se puede eliminar a un administrador' }, { status: 400 })
    }

    const userEmail = targetProfile.email

    // 1. Desasociar visitas donde era asesor (conservar las caracterizaciones)
    await supabaseAdmin
      .from('visitas')
      .update({ asesor_id: null })
      .eq('asesor_id', userId)

    // 2a. Eliminar invitaciones CREADAS por este usuario
    await supabaseAdmin
      .from('invitations')
      .delete()
      .eq('invitado_por', userId)

    // 2b. Eliminar invitaciones DIRIGIDAS a este usuario (por email)
    if (userEmail) {
      await supabaseAdmin
        .from('invitations')
        .delete()
        .eq('email', userEmail)
    }

    // 3. Eliminar el perfil manualmente (aunque el cascade de auth.users también lo haría,
    //    hacerlo explícito evita errores de FK si hay restricciones adicionales)
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    // 4. Eliminar de auth.users — esto es la fuente de verdad en Supabase Auth
    //    Al eliminarlo aquí, el trigger de Supabase también limpiaría profiles si
    //    aún existiera (CASCADE). Si profiles ya no existe, la operación igual procede.
    const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteErr) {
      return NextResponse.json(
        { error: `Error eliminando usuario de auth: ${authDeleteErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      mensaje: `Usuario ${userEmail || targetProfile.nombre_completo} eliminado correctamente`,
    })
  } catch (err) {
    console.error('[DeleteUser] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
