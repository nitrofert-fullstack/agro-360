import { NextRequest, NextResponse } from 'next/server'

const AGRO_BASE = 'https://api.agromonitoring.com/agro/1.0'
const API_KEY   = process.env.AGRO_API_KEY!

// Catch-all proxy for Agromonitoring tile requests.
// URL pattern: /api/agro-tile/[...path]
// Example:     /api/agro-tile/image/v3/ndvi/12/1234/5678?polyid=XXX
// Proxies to:  https://api.agromonitoring.com/agro/1.0/image/v3/ndvi/12/1234/5678?polyid=XXX&appid=KEY
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params
  const path = pathSegments.join('/')
  const { searchParams } = new URL(req.url)

  const forwardParams = new URLSearchParams()
  searchParams.forEach((v, k) => forwardParams.set(k, v))
  forwardParams.set('appid', API_KEY)

  const url = `${AGRO_BASE}/${path}?${forwardParams.toString()}`

  try {
    const res = await fetch(url)
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
