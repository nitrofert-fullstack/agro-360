import { NextRequest, NextResponse } from 'next/server'

interface WeatherData {
  temperature: number
  humidity: number
  description: string
  windSpeed: number
  feelsLike: number
}

export async function POST(request: NextRequest) {
  try {
    const { lat, lng } = await request.json()
    
    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitud y longitud requeridas' },
        { status: 400 }
      )
    }

    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key de OpenWeather no configurada' },
        { status: 500 }
      )
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=es`

    const response = await fetch(url)
    
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
