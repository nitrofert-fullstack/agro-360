import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const AGRO_BASE = 'https://api.agromonitoring.com/agro/1.0'
const API_KEY   = process.env.AGROMONITORING_API_KEY

// GET /api/agro-ndvi?polyid=XXX&start=1700000000&end=1710000000
// start y end son unix timestamps en segundos
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get('x-real-ip')
          || 'unknown'

  if (!rateLimit(`agro-ndvi:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intente en un momento.' }, { status: 429 })
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: 'NDVI no disponible: AGROMONITORING_API_KEY no configurada' },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(req.url)

  const polyid = searchParams.get('polyid')
  const start  = searchParams.get('start')
  const end    = searchParams.get('end')

  if (!polyid || !start || !end) {
    return NextResponse.json(
      { error: 'Faltan parámetros: polyid, start, end' },
      { status: 400 }
    )
  }

  const url = `${AGRO_BASE}/ndvi/history?polyid=${polyid}&start=${start}&end=${end}&appid=${API_KEY}`
  const res  = await fetch(url, { signal: AbortSignal.timeout(8000) })

  if (!res.ok) {
    return NextResponse.json({ error: `API externa error: ${res.status}` }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
