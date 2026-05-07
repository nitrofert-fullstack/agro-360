import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const documento = searchParams.get('documento')?.trim()

  if (!documento) {
    return NextResponse.json({ error: 'Parámetro documento requerido' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userProfile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { rol: true, numero_documento: true },
  })

  if (userProfile?.rol === 'agricultor') {
    if (!userProfile.numero_documento || userProfile.numero_documento !== documento) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }
  }

  const beneficiario = await prisma.beneficiarios.findFirst({
    where:   { numero_documento: documento },
    orderBy: { created_at: 'desc' },
  })

  if (!beneficiario) {
    return NextResponse.json({ encontrado: false })
  }

  const ultimoPredio = await prisma.predios.findFirst({
    where:   { id_beneficiario: beneficiario.id },
    orderBy: { created_at: 'desc' },
    select:  { municipio: true, departamento: true, vereda: true },
  })

  return NextResponse.json({
    encontrado: true,
    beneficiario: {
      tipoDocumento:    beneficiario.tipo_documento || 'CC',
      nombres:          beneficiario.nombres || '',
      apellidos:        beneficiario.apellidos || '',
      fechaNacimiento:  beneficiario.fecha_nacimiento?.toISOString().split('T')[0] || '',
      edad:             beneficiario.edad ?? null,
      genero:           beneficiario.genero || '',
      personasACargo:   beneficiario.personas_a_cargo ?? null,
      telefono:         beneficiario.telefono || '',
      correo:           beneficiario.correo || '',
      ocupacionPrincipal: beneficiario.ocupacion_principal || '',
      asociacion: beneficiario.asociacion || '',
      contactoSecundario: {
        nombre:    beneficiario.nombre_contacto_secundario || '',
        telefono:  beneficiario.telefono_secundario || '',
        parentesco: beneficiario.parentesco_contacto_secundario || '',
      },
      ultimoPredio: ultimoPredio ? {
        municipio:    ultimoPredio.municipio || '',
        departamento: ultimoPredio.departamento || '',
        vereda:       ultimoPredio.vereda || '',
      } : null,
    },
  })
}
