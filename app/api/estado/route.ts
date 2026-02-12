import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const estadosValidos = ['PENDIENTE_SINCRONIZACION', 'SINCRONIZADO', 'EN_REVISION', 'APROBADO', 'RECHAZADO']
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: `Estado invalido. Validos: ${estadosValidos.join(', ')}` }, { status: 400 })
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

    return NextResponse.json({ success: true, estado })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
