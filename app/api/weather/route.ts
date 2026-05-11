import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

interface WeatherData {
  temperature: number
  humidity: number
  description: string
  windSpeed: number
  feelsLike: number
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || request.headers.get('x-real-ip')
          || 'unknown'

  if (!rateLimit(`weather:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intente en un momento.' }, { status: 429 })
  }

  try {
    const { lat, lng } = await request.json()
    
    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitud y longitud requeridas' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENWEATHER_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key de OpenWeather no configurada' },
        { status: 500 }
      )
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=es`

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Error al obtener datos del clima' },
        { status: response.status }
      )
    }

    const data = await response.json()

    const weatherData: WeatherData = {
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity,
      description: data.weather[0].main,
      windSpeed: Math.round(data.wind.speed * 10) / 10,
      feelsLike: Math.round(data.main.feels_like),
    }

    return NextResponse.json(weatherData)
  } catch (error) {
    console.error('Error en API de clima:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
