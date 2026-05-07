import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const LIMITE_MAX = 100
const LIMITE_DEFAULT = 50

function unauthorized() {
  return NextResponse.json(
    { error: 'No autorizado. Incluye el header X-API-Key válido.' },
    { status: 401, headers: { 'WWW-Authenticate': 'ApiKey' } }
  )
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function GET(request: Request) {
  // ── 1. Autenticación por API Key ───────────────────────────────────────────
  const apiKey = request.headers.get('x-api-key')
  const validKey = process.env.EXTERNAL_API_KEY

  if (!validKey) {
    return NextResponse.json(
      { error: 'API externa no configurada en el servidor.' },
      { status: 503 }
    )
  }
  if (!apiKey || apiKey !== validKey) {
    return unauthorized()
  }

  // ── 2. Parámetros ──────────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url)

  const estadoParam  = searchParams.get('estado')
  const fechaDesde   = searchParams.get('fecha_desde')
  const fechaHasta   = searchParams.get('fecha_hasta')
  const municipioParam = searchParams.get('municipio')
  const paginaParam  = searchParams.get('pagina')
  const limiteParam  = searchParams.get('limite')

  const pagina = Math.max(1, parseInt(paginaParam ?? '1') || 1)
  const limite = Math.min(LIMITE_MAX, Math.max(1, parseInt(limiteParam ?? String(LIMITE_DEFAULT)) || LIMITE_DEFAULT))

  // Validar fechas
  let desde: Date | undefined
  let hasta: Date | undefined
  if (fechaDesde) {
    desde = new Date(fechaDesde)
    if (isNaN(desde.getTime())) return badRequest('fecha_desde inválida. Formato esperado: YYYY-MM-DD')
  }
  if (fechaHasta) {
    hasta = new Date(fechaHasta)
    if (isNaN(hasta.getTime())) return badRequest('fecha_hasta inválida. Formato esperado: YYYY-MM-DD')
    hasta.setHours(23, 59, 59, 999) // incluir todo el día
  }

  // Estados válidos
  const ESTADOS_VALIDOS = ['INICIADO', 'REVISADO', 'EN_ESTUDIO_CREDITO', 'APROBADO', 'CANCELADO', 'SINCRONIZADO', 'EN_REVISION', 'RECHAZADO']
  let estados: string[] | undefined
  if (estadoParam) {
    estados = estadoParam.split(',').map(e => e.trim().toUpperCase()).filter(Boolean)
    const invalidos = estados.filter(e => !ESTADOS_VALIDOS.includes(e))
    if (invalidos.length > 0) {
      return badRequest(`Estado(s) inválido(s): ${invalidos.join(', ')}. Válidos: ${ESTADOS_VALIDOS.join(', ')}`)
    }
  }

  // ── 3. Construcción del WHERE ──────────────────────────────────────────────
  const where: Prisma.caracterizacionesWhereInput = {
    ...(estados && { estado: { in: estados } }),
    ...(desde || hasta
      ? {
          visitas: {
            fecha_visita: {
              ...(desde && { gte: desde }),
              ...(hasta && { lte: hasta }),
            },
          },
        }
      : {}),
    ...(municipioParam
      ? {
          predios: {
            municipio: { contains: municipioParam, mode: 'insensitive' },
          },
        }
      : {}),
  }

  // ── 4. Query ───────────────────────────────────────────────────────────────
  try {
    const [total, registros] = await Promise.all([
      prisma.caracterizaciones.count({ where }),
      prisma.caracterizaciones.findMany({
        where,
        skip: (pagina - 1) * limite,
        take: limite,
        orderBy: { created_at: 'desc' },
        include: {
          beneficiarios: true,
          predios: true,
          visitas: true,
        },
      }),
    ])

    // ── 5. Mapeo de respuesta ────────────────────────────────────────────────
    const data = registros.map(c => ({
      id: c.id,
      estado: c.estado ?? null,
      observaciones: c.observaciones ?? null,
      fecha_registro: c.created_at,
      ultima_actualizacion: c.updated_at,

      agricultor: {
        nombres:              c.beneficiarios.nombres,
        apellidos:            c.beneficiarios.apellidos,
        tipo_documento:       c.beneficiarios.tipo_documento,
        numero_documento:     c.beneficiarios.numero_documento,
        correo:               c.beneficiarios.correo ?? null,
        telefono:             c.beneficiarios.telefono ?? null,
        genero:               c.beneficiarios.genero ?? null,
        edad:                 c.beneficiarios.edad ?? null,
        fecha_nacimiento:     c.beneficiarios.fecha_nacimiento ?? null,
        ocupacion_principal:  c.beneficiarios.ocupacion_principal ?? null,
        asociacion:           c.beneficiarios.asociacion ?? null,
        personas_a_cargo:     c.beneficiarios.personas_a_cargo ?? null,
      },

      predio: {
        nombre:               c.predios.nombre_predio ?? null,
        departamento:         c.predios.departamento,
        municipio:            c.predios.municipio,
        vereda:               c.predios.vereda ?? null,
        direccion:            c.predios.direccion ?? null,
        tipo_tenencia:        c.predios.tipo_tenencia ?? null,
        area_total_ha:        c.predios.area_total_hectareas        ? Number(c.predios.area_total_hectareas)        : null,
        area_productiva_ha:   c.predios.area_productiva_hectareas   ? Number(c.predios.area_productiva_hectareas)   : null,
        altitud_msnm:         c.predios.altitud_msnm                ? Number(c.predios.altitud_msnm)                : null,
        latitud:              c.predios.latitud                     ? Number(c.predios.latitud)                     : null,
        longitud:             c.predios.longitud                    ? Number(c.predios.longitud)                    : null,
        cultivos_existentes:  c.predios.cultivos_existentes ?? null,
      },

      visita: {
        fecha:             c.visitas.fecha_visita,
        tecnico:           c.visitas.nombre_tecnico,
        codigo_formulario: c.visitas.codigo_formulario ?? null,
        radicado:          c.visitas.radicado_oficial ?? c.visitas.radicado_local ?? null,
      },
    }))

    return NextResponse.json(
      {
        data,
        paginacion: {
          total,
          pagina,
          por_pagina: limite,
          paginas: Math.ceil(total / limite),
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-Total-Count': String(total),
        },
      }
    )
  } catch (error) {
    console.error('[API Externa] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}

// Bloquear todos los demás métodos
export async function POST()   { return NextResponse.json({ error: 'Método no permitido' }, { status: 405 }) }
export async function PUT()    { return NextResponse.json({ error: 'Método no permitido' }, { status: 405 }) }
export async function DELETE() { return NextResponse.json({ error: 'Método no permitido' }, { status: 405 }) }
export async function PATCH()  { return NextResponse.json({ error: 'Método no permitido' }, { status: 405 }) }
