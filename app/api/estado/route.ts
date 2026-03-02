import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendEmail, buildEstadoNotificationEmail } from '@/lib/email/mailer'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { visitaId, estado, observaciones } = await request.json()

    if (!visitaId || !estado) {
      return NextResponse.json({ error: 'visitaId y estado son requeridos' }, { status: 400 })
    }

    const estadosValidos = ['INICIADO', 'REVISADO', 'EN_ESTUDIO_CREDITO', 'APROBADO', 'CANCELADO']
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: `Estado invalido. Validos: ${estadosValidos.join(', ')}` }, { status: 400 })
    }

    // Verificar rol del usuario y aplicar matriz de transiciones
    const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
    if (!['admin', 'asesor', 'analista'].includes(profile?.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }
    const estadosPorRol: Record<string, string[]> = {
      admin: estadosValidos,
      asesor: ['REVISADO'],
      analista: ['EN_ESTUDIO_CREDITO', 'APROBADO', 'CANCELADO'],
    }
    if (profile?.rol !== 'admin' && !estadosPorRol[profile?.rol]?.includes(estado)) {
      return NextResponse.json({ error: `El rol ${profile?.rol} no puede asignar el estado ${estado}` }, { status: 403 })
    }

    // Actualizar estado de la visita
    const { error: visitaErr } = await supabase
      .from('visitas')
      .update({
        estado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitaId)

    if (visitaErr) {
      return NextResponse.json({ error: `Error actualizando visita: ${visitaErr.message}` }, { status: 500 })
    }

    // Si hay observaciones, actualizar la caracterizacion
    if (observaciones !== undefined) {
      await supabase
        .from('caracterizaciones')
        .update({
          observaciones,
          updated_at: new Date().toISOString(),
        })
        .eq('id_visita', visitaId)
    }

    // Enviar email de notificación al beneficiario
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

    if (serviceRoleKey && supabaseUrl) {
      try {
        const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

        const { data: carac } = await adminClient
          .from('caracterizaciones')
          .select(`
            visita:visitas(radicado_oficial),
            beneficiario:beneficiarios(nombres, apellidos, correo)
          `)
          .eq('id_visita', visitaId)
          .single()

        const correo = (carac?.beneficiario as any)?.correo
        const nombres = (carac?.beneficiario as any)?.nombres || ''
        const apellidos = (carac?.beneficiario as any)?.apellidos || ''
        const nombreCompleto = `${nombres} ${apellidos}`.trim() || 'Productor'
        const radicadoOficial = (carac?.visita as any)?.radicado_oficial || visitaId

        if (correo) {
          const html = buildEstadoNotificationEmail({
            nombreCompleto,
            radicadoOficial,
            nuevoEstado: estado,
            observaciones: observaciones || null,
            appUrl,
          })
          const estadoLabel: Record<string, string> = {
            INICIADO: 'ha sido iniciada',
            REVISADO: 'fue revisada',
            EN_ESTUDIO_CREDITO: 'está en evaluación de crédito',
            APROBADO: 'fue aprobada',
            CANCELADO: 'fue cancelada',
          }
          const asunto = `Tu caracterización ${estadoLabel[estado] ?? `cambió a ${estado}`} — Agro360`
          await sendEmail({ to: correo, subject: asunto, html })
        }
      } catch (emailErr) {
        console.error('[Estado] Error enviando email de notificación:', emailErr)
      }
    }

    return NextResponse.json({ success: true, estado })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
