import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const ALLOWED_TYPES = ['temp_new', 'precipitation_new'] as const
type TileType = typeof ALLOWED_TYPES[number]

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || request.headers.get('x-real-ip')
          || 'unknown'

  if (!rateLimit(`weather-tile:${ip}`, 500, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intente en un momento.' }, { status: 429 })
  }

  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') as TileType | null
  const z = searchParams.get('z')
  const x = searchParams.get('x')
  const y = searchParams.get('y')

  if (!type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json(
      { error: 'Parámetro type inválido. Valores permitidos: temp_new, precipitation_new' },
      { status: 400 }
    )
  }

  if (!z || !x || !y) {
    return NextResponse.json(
      { error: 'Parámetros z, x e y son requeridos' },
      { status: 400 }
    )
  }

  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENWEATHER_API_KEY no está configurada en el servidor' },
      { status: 503 }
    )
  }

  const tileUrl = `https://tile.openweathermap.org/map/${type}/${z}/${x}/${y}.png?appid=${apiKey}`

  try {
    const response = await fetch(tileUrl, {
      headers: {
        'User-Agent': 'AgroSantander360/1.0',
      },
    })

    if (!response.ok) {
      return new NextResponse(null, { status: response.status })
    }

    const imageBuffer = await response.arrayBuffer()

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=600', // 10 min cache para tiles del clima
      },
    })
  } catch (error) {
    console.error('[weather-tile] Error al obtener tile:', error)
    return NextResponse.json(
      { error: 'Error al obtener el tile de OpenWeatherMap' },
      { status: 502 }
    )
  }
}
