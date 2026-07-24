import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userProfile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { rol: true, numero_documento: true },
    })

    // ── Obtener visita por UUID o radicado ──────────────────────────────────
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    let visita = null

    if (isUUID) {
      visita = await prisma.visitas.findUnique({ where: { id } })
    } else {
      visita = await prisma.visitas.findUnique({ where: { radicado_oficial: id } })
        ?? await prisma.visitas.findUnique({ where: { radicado_local: id } })
    }

    if (!visita) {
      return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })
    }

    // ── Caracterización principal ───────────────────────────────────────────
    const carac = await prisma.caracterizaciones.findFirst({
      where: { id_visita: visita.id },
    })

    if (!carac) {
      return NextResponse.json({ error: 'Caracterización no encontrada' }, { status: 404 })
    }

    // ── Verificar acceso agricultor ─────────────────────────────────────────
    if (userProfile?.rol === 'agricultor') {
      const numDoc = userProfile.numero_documento
      const ownBenef = numDoc
        ? await prisma.beneficiarios.findFirst({ where: { numero_documento: numDoc }, select: { id: true } })
        : await prisma.beneficiarios.findFirst({ where: { correo: user.email ?? undefined }, select: { id: true } })

      if (!ownBenef || ownBenef.id !== carac.id_beneficiario) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
      }
    }

    // ── Datos relacionados en paralelo ──────────────────────────────────────
    const [beneficiario, predio, infoFinanciera, conceptoVisita] = await Promise.all([
      prisma.beneficiarios.findUnique({ where: { id: carac.id_beneficiario } }),
      prisma.predios.findUnique({
        where: { id: carac.id_predio },
        include: {
          caracterizacion_predio: true,
          abastecimiento_agua:    true,
          riesgos_predio:         true,
          area_productiva:        true,
        },
      }),
      prisma.informacion_financiera.findFirst({
        where:   { id_beneficiario: carac.id_beneficiario },
        orderBy: { created_at: 'desc' },
      }),
      prisma.concepto_visita.findUnique({ where: { id_caracterizacion: carac.id } }),
    ])

    return NextResponse.json({
      visita,
      caracterizacion:    carac,
      beneficiario,
      predio,
      caracterizacionPredio: predio?.caracterizacion_predio ?? null,
      abastecimientoAgua:    predio?.abastecimiento_agua?.[0] ?? null,
      riesgosPredio:         predio?.riesgos_predio?.[0]      ?? null,
      areaProductiva:        predio?.area_productiva?.[0]     ?? null,
      infoFinanciera,
      conceptoVisita,
    })
  } catch (err) {
    console.error('[API] Error en caracterizacion/[id]:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
