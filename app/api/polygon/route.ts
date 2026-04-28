import { NextRequest, NextResponse } from 'next/server'

const AGRO_BASE = 'https://api.agromonitoring.com/agro/1.0'
const API_KEY   = process.env.AGROMONITORING_API_KEY

function noKeyResponse() {
  return NextResponse.json(
    { error: 'NDVI no disponible: AGROMONITORING_API_KEY no configurada' },
    { status: 503 }
  )
}

// GET → lista todos los polígonos de la cuenta
export async function GET() {
  if (!API_KEY) return noKeyResponse()
  const res  = await fetch(`${AGRO_BASE}/polygons?appid=${API_KEY}`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

// POST → crea un polígono nuevo
// Body: { name: string, coordinates: [lat, lng][] }
export async function POST(req: NextRequest) {
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
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
