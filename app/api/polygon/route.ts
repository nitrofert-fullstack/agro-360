import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const AGRO_BASE = 'https://api.agromonitoring.com/agro/1.0'
const API_KEY   = process.env.AGROMONITORING_API_KEY

function noKeyResponse() {
  return NextResponse.json(
    { error: 'NDVI no disponible: AGROMONITORING_API_KEY no configurada' },
    { status: 503 }
  )
}

// GET → lista todos los polígonos de la cuenta
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get('x-real-ip')
          || 'unknown'

  if (!rateLimit(`polygon:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intente en un momento.' }, { status: 429 })
  }

  if (!API_KEY) return noKeyResponse()
  const res  = await fetch(`${AGRO_BASE}/polygons?appid=${API_KEY}`, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) {
    return NextResponse.json({ error: `API externa error: ${res.status}` }, { status: res.status })
  }
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

// POST → crea un polígono nuevo
// Body: { name: string, coordinates: [lat, lng][] }
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get('x-real-ip')
          || 'unknown'

  if (!rateLimit(`polygon:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intente en un momento.' }, { status: 429 })
  }

  if (!API_KEY) return noKeyResponse()
  const { name, coordinates } = await req.json()

  // Agromonitoring pide [lng, lat] y el anillo debe cerrarse
  const ring = coordinates.map(([lat, lng]: [number, number]) => [lng, lat])
  ring.push([...ring[0]])

  const body = {
    name,
    geo_json: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
    },
  }

  const res = await fetch(`${AGRO_BASE}/polygons?appid=${API_KEY}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(8000),
  })

  const data = await res.json()

  // 422 duplicado: Agromonitoring indica que el polígono ya existe y da su ID.
  // Lo tratamos como éxito — devolvemos el ID existente con status 200.
  if (res.status === 422 && typeof data.message === 'string') {
    const match = data.message.match(/['"]([a-f0-9]{24})['"]/i)
    if (match) {
      return NextResponse.json({ id: match[1], duplicated: true }, { status: 200 })
    }
  }

  // Traducir otros mensajes de error conocidos de Agromonitoring (vienen en inglés)
  if (!res.ok && typeof data.message === 'string') {
    const msg: string = data.message
    if (/area of the polygon/i.test(msg)) {
      const haMatch = msg.match(/([\d.]+)\s*ha/)
      const ha = haMatch ? haMatch[1] : '?'
      data.message = `El área del polígono (${ha} ha) es demasiado pequeña. Agromonitoring requiere entre 1 y 3.000 ha. Dibuja un área mayor o usa NASA MODIS para predios pequeños.`
    } else if (/must be from/i.test(msg)) {
      data.message = data.message
        .replace('must be from', 'debe estar entre')
        .replace('to', 'y')
    }
  }

  return NextResponse.json(data, { status: res.status })
}
