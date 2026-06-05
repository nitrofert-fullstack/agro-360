import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, buildEstadoNotificationEmail } from '@/lib/email/mailer'
import { isUuid } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { rol: true },
    })

    if (!['admin', 'asesor', 'analista'].includes(profile?.rol ?? '')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id, nuevoEstado, observaciones } = await request.json()

    if (!id || !nuevoEstado) {
      return NextResponse.json({ error: 'id y nuevoEstado son requeridos' }, { status: 400 })
    }

    if (!isUuid(id)) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    const estadosValidos = ['INICIADO', 'REVISADO', 'EN_ESTUDIO_CREDITO', 'APROBADO', 'CANCELADO']
    if (!estadosValidos.includes(nuevoEstado)) {
      return NextResponse.json({ error: `Estado invalido. Válidos: ${estadosValidos.join(', ')}` }, { status: 400 })
    }

    const rol = profile?.rol ?? ''
    const estadosPorRol: Record<string, string[]> = {
      admin:    estadosValidos,
      asesor:   ['REVISADO'],
      analista: ['EN_ESTUDIO_CREDITO', 'APROBADO', 'CANCELADO'],
    }
    if (rol !== 'admin' && !estadosPorRol[rol]?.includes(nuevoEstado)) {
      return NextResponse.json({ error: `El rol ${rol} no puede asignar el estado ${nuevoEstado}` }, { status: 403 })
    }

    // ── Obtener caracterización ─────────────────────────────────────────────
    const carac = await prisma.caracterizaciones.findUnique({
      where: { id },
      select: { id: true, id_visita: true, id_beneficiario: true },
    })

    if (!carac) {
      return NextResponse.json({ error: 'Caracterización no encontrada' }, { status: 404 })
    }

    // ── Actualizar estado ───────────────────────────────────────────────────
    await prisma.caracterizaciones.update({
      where: { id },
      data: {
        estado:     nuevoEstado,
        updated_at: new Date(),
        ...(observaciones !== undefined ? { observaciones } : {}),
      },
    })

    // ── Notificación por email (no bloquea) ─────────────────────────────────
    try {
      const [benef, visita] = await Promise.all([
        prisma.beneficiarios.findUnique({
          where:  { id: carac.id_beneficiario },
          select: { correo: true, nombres: true, apellidos: true },
        }),
        prisma.visitas.findUnique({
          where:  { id: carac.id_visita },
          select: { radicado_oficial: true },
        }),
      ])

      const correo = benef?.correo
      if (correo) {
        const nombreCompleto = `${benef?.nombres || ''} ${benef?.apellidos || ''}`.trim() || 'Productor'
        const radicadoOficial = visita?.radicado_oficial || id
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

        const estadoLabel: Record<string, string> = {
          INICIADO:           'ha sido iniciada',
          REVISADO:           'fue revisada',
          EN_ESTUDIO_CREDITO: 'está en evaluación de crédito',
          APROBADO:           'fue aprobada',
          CANCELADO:          'fue cancelada',
        }
        const asunto = `Tu caracterización ${estadoLabel[nuevoEstado] ?? `cambió a ${nuevoEstado}`} — Santander Agro360`

        await sendEmail({
          to: correo,
          subject: asunto,
          html: buildEstadoNotificationEmail({
            nombreCompleto,
            radicadoOficial,
            nuevoEstado,
            observaciones: observaciones || null,
            appUrl,
          }),
        })
      }
    } catch (emailErr) {
      console.error('[UpdateEstado] Error enviando email:', emailErr)
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
