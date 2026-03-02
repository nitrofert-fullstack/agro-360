import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendEmail, buildEstadoNotificationEmail } from '@/lib/email/mailer'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar que sea asesor, analista o admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (!['admin', 'asesor', 'analista'].includes(profile?.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id, nuevoEstado, observaciones } = await request.json()

    if (!id || !nuevoEstado) {
      return NextResponse.json({ error: 'id y nuevoEstado son requeridos' }, { status: 400 })
    }

    const estadosValidos = ['INICIADO', 'REVISADO', 'EN_ESTUDIO_CREDITO', 'APROBADO', 'CANCELADO']
    if (!estadosValidos.includes(nuevoEstado)) {
      return NextResponse.json({ error: `Estado invalido. Válidos: ${estadosValidos.join(', ')}` }, { status: 400 })
    }

    // Validar matriz de transiciones por rol
    const rol = profile?.rol
    const estadosPorRol: Record<string, string[]> = {
      admin: estadosValidos,
      asesor: ['REVISADO'],
      analista: ['EN_ESTUDIO_CREDITO', 'APROBADO', 'CANCELADO'],
    }
    if (rol !== 'admin' && !estadosPorRol[rol]?.includes(nuevoEstado)) {
      return NextResponse.json({ error: `El rol ${rol} no puede asignar el estado ${nuevoEstado}` }, { status: 403 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

    // 1. Obtener id_visita e id_beneficiario de la caracterización (sin joins para evitar PGRST204)
    const { data: caracBase, error: caracErr } = await adminClient
      .from('caracterizaciones')
      .select('id, id_visita, id_beneficiario, observaciones')
      .eq('id', id)
      .single()

    if (caracErr || !caracBase) {
      return NextResponse.json({ error: 'Caracterización no encontrada' }, { status: 404 })
    }

    const visitaId = caracBase.id_visita

    // 2. Actualizar el estado en la tabla visitas (fuente de verdad del estado)
    const { error: visitaErr } = await adminClient
      .from('visitas')
      .update({
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitaId)

    if (visitaErr) throw visitaErr

    // 3. Actualizar observaciones en caracterizaciones si se proveen
    if (observaciones !== undefined) {
      await adminClient
        .from('caracterizaciones')
        .update({
          observaciones,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    }

    // 4. Enviar email de notificación al beneficiario (queries separadas para evitar errores de schema cache)
    try {
      // Obtener datos del beneficiario
      const { data: benef } = caracBase.id_beneficiario
        ? await adminClient.from('beneficiarios').select('correo, nombres, apellidos').eq('id', caracBase.id_beneficiario).single()
        : { data: null }

      // Obtener radicado_oficial de la visita
      const { data: visitaData } = await adminClient
        .from('visitas')
        .select('radicado_oficial')
        .eq('id', visitaId)
        .single()

      const correo = (benef as any)?.correo
      const nombres = (benef as any)?.nombres || ''
      const apellidos = (benef as any)?.apellidos || ''
      const nombreCompleto = `${nombres} ${apellidos}`.trim() || 'Productor'
      const radicadoOficial = (visitaData as any)?.radicado_oficial || id

      if (correo) {
        const html = buildEstadoNotificationEmail({
          nombreCompleto,
          radicadoOficial,
          nuevoEstado,
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
        const asunto = `Tu caracterización ${estadoLabel[nuevoEstado] ?? `cambió a ${nuevoEstado}`} — Agro360`

        await sendEmail({ to: correo, subject: asunto, html })
        console.log(`[UpdateEstado] Email de estado "${nuevoEstado}" enviado a ${correo}`)
      }
    } catch (emailErr) {
      // El error de email no debe bloquear la respuesta
      console.error('[UpdateEstado] Error enviando email de estado:', emailErr)
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
