import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function DELETE(request: Request) {
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
      return NextResponse.json({ error: 'Solo administradores pueden eliminar caracterizaciones' }, { status: 403 })
    }

    const { caracterizacionId } = await request.json()
    if (!caracterizacionId) {
      return NextResponse.json({ error: 'caracterizacionId es requerido' }, { status: 400 })
    }

    // ── Obtener IDs relacionados ─────────────────────────────────────────────
    const carac = await prisma.caracterizaciones.findUnique({
      where: { id: caracterizacionId },
      select: {
        id: true,
        id_visita: true,
        id_beneficiario: true,
        foto_1_url: true,
        foto_2_url: true,
        firma_productor_url: true,
        foto_doc_frontal_url: true,
        foto_doc_trasera_url: true,
        foto_beneficiario_url: true,
      },
    })

    if (!carac) {
      return NextResponse.json({ error: 'Caracterización no encontrada' }, { status: 404 })
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ── Eliminar archivos del storage (best-effort) ──────────────────────────
    const photoUrls = [
      carac.foto_1_url, carac.foto_2_url, carac.firma_productor_url,
      carac.foto_doc_frontal_url, carac.foto_doc_trasera_url, carac.foto_beneficiario_url,
    ].filter(Boolean) as string[]

    for (const url of photoUrls) {
      try {
        const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
        if (match) {
          const [, bucket, path] = match
          await supabaseAdmin.storage.from(bucket).remove([decodeURIComponent(path)])
        }
      } catch {
        // Si falla la limpieza del storage no bloqueamos la eliminación
      }
    }

    // ── Verificar si el beneficiario tiene otras caracterizaciones (en otras visitas) ──
    const totalCaracterizacionesBeneficiario = await prisma.caracterizaciones.count({
      where: { id_beneficiario: carac.id_beneficiario },
    })

    if (totalCaracterizacionesBeneficiario > 1) {
      // El beneficiario tiene historial en otras visitas → solo eliminar esta caracterización/visita
      await prisma.caracterizaciones.delete({ where: { id: caracterizacionId } })

      // Eliminar la visita si no tiene más beneficiarios vinculados
      const otrosBeneficiariosEnVisita = await prisma.beneficiarios.count({
        where: { id_visita: carac.id_visita },
      })
      if (otrosBeneficiariosEnVisita === 0) {
        await prisma.visitas.delete({ where: { id: carac.id_visita } })
      }

      return NextResponse.json({
        success: true,
        mensaje: 'Caracterización eliminada. El beneficiario se conservó porque tiene otras visitas registradas.',
      })
    }

    // ── Beneficiario solo tiene esta caracterización → eliminar con cascada ──
    await prisma.beneficiarios.delete({
      where: { id: carac.id_beneficiario },
    })

    // ── Eliminar visita si no tiene más beneficiarios ────────────────────────
    const otrosBeneficiarios = await prisma.beneficiarios.count({
      where: { id_visita: carac.id_visita },
    })
    if (otrosBeneficiarios === 0) {
      await prisma.visitas.delete({ where: { id: carac.id_visita } })
    }

    return NextResponse.json({
      success: true,
      mensaje: 'Caracterización y datos del beneficiario eliminados correctamente.',
    })
  } catch (err) {
    console.error('[DeleteCaracterizacion] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
