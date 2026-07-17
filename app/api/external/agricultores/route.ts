import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { rateLimit } from '@/lib/rate-limit'

const LIMITE_MAX = 100
const LIMITE_DEFAULT = 50

function formatTelefono(tel: string | null | undefined): string | null {
  if (!tel) return null
  const digits = tel.replace(/\D/g, '')
  // Número colombiano: 10 dígitos que empiezan con 3
  if (digits.length === 10 && digits.startsWith('3')) return `+57${digits}`
  // Ya tiene código de país (12 dígitos: 57 + 10)
  if (digits.length === 12 && digits.startsWith('57')) return `+${digits}`
  return tel
}

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
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
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
  if (!rateLimit(`external-api:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, { status: 429 })
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
          predios: {
            include: {
              area_productiva: true,
            },
          },
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
        telefono:             formatTelefono(c.beneficiarios.telefono),
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

      sistema_productivo: c.predios.area_productiva.map(ap => ({
        sistema:                   ap.sistema_productivo ?? null,
        cultivo:                   ap.caracterizacion_cultivo ?? null,
        cantidad_produccion:       ap.cantidad_produccion ?? null,
        estado_cultivo:            ap.estado_cultivo ?? null,
        tiene_infraestructura:     ap.tiene_infraestructura_procesamiento ?? null,
        estructuras:               ap.estructuras ?? null,
        interesado_programa:       ap.interesado_programa ?? null,
        donde_comercializa:        ap.donde_comercializa ?? null,
        ingreso_mensual_ventas:    ap.ingreso_mensual_ventas ? Number(ap.ingreso_mensual_ventas) : null,
        sistema_interes:           ap.sistema_productivo_interes ?? null,
        hectareas_siembra_nueva:   ap.hectareas_siembra_nueva ? Number(ap.hectareas_siembra_nueva) : null,
        hectareas_renovacion:      ap.hectareas_renovacion ? Number(ap.hectareas_renovacion) : null,
      })),

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
