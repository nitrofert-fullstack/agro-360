import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const AGRO_BASE = 'https://api.agromonitoring.com/agro/1.0'

// GET /api/agro-images?polyid=XXX&start=T1&end=T2
// start y end son unix timestamps en segundos
// Devuelve las imágenes satelitales disponibles para el polígono en ese rango,
// con las tile URLs reescritas para ir a través de nuestro proxy /api/agro-tile
// (así el API key nunca se expone al cliente).
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get('x-real-ip')
          || 'unknown'

  if (!rateLimit(`agro-images:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intente en un momento.' }, { status: 429 })
  }

  const API_KEY = process.env.AGROMONITORING_API_KEY
  if (!API_KEY) {
    return NextResponse.json({ error: 'AGROMONITORING_API_KEY no configurada' }, { status: 503 })
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

  const res  = await fetch(
    `${AGRO_BASE}/image/search?start=${start}&end=${end}&polyid=${polyid}&appid=${API_KEY}`,
    { signal: AbortSignal.timeout(20000) }
  )
  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status })
  }

  // Reescribir tile URLs para que pasen por nuestro proxy (oculta el API key)
  const proxied = Array.isArray(data)
    ? data.map((img: any) => {
        if (!img.tile) return img
        const tile: Record<string, string> = {}
        for (const [band, rawUrl] of Object.entries(img.tile as Record<string, string>)) {
          try {
            // Agromonitoring devuelve URLs con {z}/{x}/{y} literales.
            // Usamos __TILE__ como placeholder para no corromper números de versión (ej: 1.0).
            // URL original: http://api.agromonitoring.com/tile/1.0/{z}/{x}/{y}/{hash}/{polyid}
            const PLACEHOLDER = '__TILE__'
            const tempUrl = (rawUrl as string).replace(/\{z\}\/\{x\}\/\{y\}/g, PLACEHOLDER)
            const u = new URL(tempUrl)
            // Solo quitar la barra inicial — el path incluye "tile/1.0/..." que el proxy necesita
            const agPath = u.pathname
              .replace(/^\//, '')
              .replace(PLACEHOLDER, '{z}/{x}/{y}')
            const params = new URLSearchParams(u.search)
            params.delete('appid')
            const qs = params.toString()
            tile[band] = `/api/agro-tile/${agPath}${qs ? '?' + qs : ''}`
          } catch {
            tile[band] = rawUrl as string
          }
        }
        return { ...img, tile }
      })
    : data

  return NextResponse.json(proxied)
}
