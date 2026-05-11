import { NextRequest, NextResponse } from 'next/server'

// Las URLs de tiles de Agromonitoring van a api.agromonitoring.com sin prefijo /agro/1.0
// Ej: tile/1.{z}/{x}/{y}/0/{hash}/{polyid} → https://api.agromonitoring.com/tile/1.12/1234/5678/...
const AGRO_BASE = 'https://api.agromonitoring.com'

// Catch-all proxy for Agromonitoring tile requests.
// URL pattern: /api/agro-tile/tile/1.{z}/{x}/{y}/0/{hash}/{polyid}
// Proxies to:  https://api.agromonitoring.com/tile/1.12/1234/5678/0/{hash}/{polyid}?appid=KEY
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const API_KEY = process.env.AGROMONITORING_API_KEY
  if (!API_KEY) {
    return NextResponse.json({ error: 'AGROMONITORING_API_KEY no configurada' }, { status: 503 })
  }

  const { path: pathSegments } = await params
  const path = pathSegments.join('/')
  const { searchParams } = new URL(req.url)

  const forwardParams = new URLSearchParams()
  searchParams.forEach((v, k) => forwardParams.set(k, v))
  forwardParams.set('appid', API_KEY)

  const url = `${AGRO_BASE}/${path}?${forwardParams.toString()}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return new NextResponse('Tile fetch error', { status: 502 })
  }
}
