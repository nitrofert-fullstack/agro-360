import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendEmail, buildEstadoNotificationEmail } from '@/lib/email/mailer'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar que sea asesor o admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (!['admin', 'asesor'].includes(profile?.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id, nuevoEstado, observaciones } = await request.json()

    if (!id || !nuevoEstado) {
      return NextResponse.json({ error: 'id y nuevoEstado son requeridos' }, { status: 400 })
    }

    // Actualizar estado en la BD (usando el cliente del usuario — RLS aplica)
    const { error: updateErr } = await supabase
      .from('caracterizaciones')
      .update({
        estado: nuevoEstado,
        ...(observaciones !== undefined ? { observaciones } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateErr) throw updateErr

    // Buscar email del beneficiario para notificarlo
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

    if (serviceRoleKey && supabaseUrl) {
      try {
        const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

        // Obtener datos de la caracterización para el email
        const { data: carac } = await adminClient
          .from('caracterizaciones')
          .select(`
            id_beneficiario,
            visita:visitas(radicado_oficial),
            beneficiario:beneficiarios(nombres, apellidos, correo)
          `)
          .eq('id', id)
          .single()

        const correo = (carac?.beneficiario as any)?.correo
        const nombres = (carac?.beneficiario as any)?.nombres || ''
        const apellidos = (carac?.beneficiario as any)?.apellidos || ''
        const nombreCompleto = `${nombres} ${apellidos}`.trim() || 'Productor'
        const radicadoOficial = (carac?.visita as any)?.radicado_oficial || id

        if (correo) {
          const html = buildEstadoNotificationEmail({
            nombreCompleto,
            radicadoOficial,
            nuevoEstado,
            observaciones: observaciones || null,
            appUrl,
          })

          const estadoLabel: Record<string, string> = {
            aprobado: 'fue aprobada',
            rechazado: 'fue rechazada',
            en_revision: 'está en revisión',
            sincronizado: 'fue sincronizada',
            pendiente: 'está pendiente de revisión',
          }
          const asunto = `Tu caracterización ${estadoLabel[nuevoEstado.toLowerCase()] ?? `cambió a ${nuevoEstado}`} — Agro360`

          await sendEmail({ to: correo, subject: asunto, html })
          console.log(`[UpdateEstado] Email de estado "${nuevoEstado}" enviado a ${correo}`)
        }
      } catch (emailErr) {
        // El error de email no debe bloquear la respuesta
        console.error('[UpdateEstado] Error enviando email de estado:', emailErr)
      }
    }

    return NextResponse.json({ success: true, mensaje: 'Estado actualizado correctamente' })
  } catch (err) {
    console.error('[UpdateEstado] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
