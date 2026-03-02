import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const documento = searchParams.get('documento')?.trim()

  if (!documento) {
    return NextResponse.json({ error: 'Parámetro documento requerido' }, { status: 400 })
  }

  // Solo usuarios autenticados
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 1. Buscar el beneficiario por número de documento
  const { data: beneficiario, error } = await supabase
    .from('beneficiarios')
    .select(`
      id,
      tipo_documento,
      nombres,
      apellidos,
      edad,
      telefono,
      correo,
      ocupacion_principal,
      nombre_contacto_secundario,
      telefono_secundario,
      parentesco_contacto_secundario
    `)
    .eq('numero_documento', documento)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!beneficiario) {
    return NextResponse.json({ encontrado: false })
  }

  // 2. Obtener el último predio del beneficiario (predios.id_beneficiario → beneficiarios.id)
  const { data: ultimoPredio } = await supabase
    .from('predios')
    .select('municipio, departamento, vereda')
    .eq('id_beneficiario', beneficiario.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    encontrado: true,
    beneficiario: {
      tipoDocumento: beneficiario.tipo_documento || 'CC',
      nombres: beneficiario.nombres || '',
      apellidos: beneficiario.apellidos || '',
      edad: beneficiario.edad ?? null,
      telefono: beneficiario.telefono || '',
      correo: beneficiario.correo || '',
      ocupacionPrincipal: beneficiario.ocupacion_principal || '',
      contactoSecundario: {
        nombre: beneficiario.nombre_contacto_secundario || '',
        telefono: beneficiario.telefono_secundario || '',
        parentesco: beneficiario.parentesco_contacto_secundario || '',
      },
      ultimoPredio: ultimoPredio ? {
        municipio: ultimoPredio.municipio || '',
        departamento: ultimoPredio.departamento || '',
        vereda: ultimoPredio.vereda || '',
      } : null,
    },
  })
}
