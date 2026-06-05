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

    const { visitaId, estado, observaciones } = await request.json()

    if (!visitaId || !estado) {
      return NextResponse.json({ error: 'visitaId y estado son requeridos' }, { status: 400 })
    }

    if (!isUuid(visitaId)) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    const estadosValidos = ['REVISADO', 'EN_ESTUDIO_CREDITO', 'APROBADO', 'CANCELADO']
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: `Estado invalido. Validos: ${estadosValidos.join(', ')}` }, { status: 400 })
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { rol: true },
    })

    if (!['admin', 'asesor', 'analista'].includes(profile?.rol ?? '')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const estadosPorRol: Record<string, string[]> = {
      admin:    estadosValidos,
      asesor:   ['REVISADO'],
      analista: ['EN_ESTUDIO_CREDITO', 'APROBADO', 'CANCELADO'],
    }
    const rol = profile?.rol ?? ''
    if (rol !== 'admin' && !estadosPorRol[rol]?.includes(estado)) {
      return NextResponse.json({ error: `El rol ${rol} no puede asignar el estado ${estado}` }, { status: 403 })
    }

    // ── Actualizar estado ───────────────────────────────────────────────────
    const updated = await prisma.caracterizaciones.updateMany({
      where: { id_visita: visitaId },
      data: {
        estado,
        updated_at: new Date(),
        ...(observaciones !== undefined ? { observaciones } : {}),
      },
    })

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Caracterización no encontrada' }, { status: 404 })
    }

    // ── Email de notificación (no bloquea) ──────────────────────────────────
    try {
      const carac = await prisma.caracterizaciones.findFirst({
        where:  { id_visita: visitaId },
        select: { id_beneficiario: true },
      })
      const [benef, visita] = await Promise.all([
        carac ? prisma.beneficiarios.findUnique({
          where:  { id: carac.id_beneficiario },
          select: { correo: true, nombres: true, apellidos: true },
        }) : null,
        prisma.visitas.findUnique({
          where:  { id: visitaId },
          select: { radicado_oficial: true },
        }),
      ])

      const correo = benef?.correo
      if (correo) {
        const nombreCompleto  = `${benef?.nombres || ''} ${benef?.apellidos || ''}`.trim() || 'Productor'
        const radicadoOficial = visita?.radicado_oficial || visitaId
        const appUrl          = process.env.NEXT_PUBLIC_APP_URL || ''

        const estadoLabel: Record<string, string> = {
          INICIADO:           'ha sido iniciada',
          REVISADO:           'fue revisada',
          EN_ESTUDIO_CREDITO: 'está en evaluación de crédito',
          APROBADO:           'fue aprobada',
          CANCELADO:          'fue cancelada',
        }
        const asunto = `Tu caracterización ${estadoLabel[estado] ?? `cambió a ${estado}`} — Santander Agro360`

        await sendEmail({
          to: correo,
          subject: asunto,
          html: buildEstadoNotificationEmail({ nombreCompleto, radicadoOficial, nuevoEstado: estado, observaciones: observaciones || null, appUrl }),
        })
      }
    } catch (emailErr) {
      console.error('[Estado] Error enviando email:', emailErr)
    }

    return NextResponse.json({ success: true, estado })
  } catch (err) {
    console.error('[Estado] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
