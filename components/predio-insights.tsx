"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Thermometer, Wind, Droplets, Leaf, Loader2, AlertTriangle } from "lucide-react"

interface WeatherData {
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  description: string
}

interface NdviData {
  ndvi: number
  interpretacion: string
  color: string
  fecha: string
}

interface PredioInsightsProps {
  lat: number
  lng: number
  areaTotalHa?: number | null
  areaProductivaHa?: number | null
}

export function PredioInsights({ lat, lng, areaTotalHa, areaProductivaHa }: PredioInsightsProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [ndvi, setNdvi] = useState<NdviData | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(true)
  const [loadingNdvi, setLoadingNdvi] = useState(true)
  const [errorWeather, setErrorWeather] = useState<string | null>(null)
  const [errorNdvi, setErrorNdvi] = useState<string | null>(null)

  useEffect(() => {
    setLoadingWeather(true)
    fetch('/api/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setWeather(d)
      })
      .catch((e) => setErrorWeather(e.message))
      .finally(() => setLoadingWeather(false))
  }, [lat, lng])

  useEffect(() => {
    setLoadingNdvi(true)
    fetch(`/api/ndvi?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setNdvi(d)
      })
      .catch((e) => setErrorNdvi(e.message))
      .finally(() => setLoadingNdvi(false))
  }, [lat, lng])

  const ndviPercent = ndvi
    ? Math.max(0, Math.min(100, ((ndvi.ndvi + 1) / 2) * 100))
    : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Clima */}
      <Card className="border-l-4 border-l-orange-500 bg-orange-500/5 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Thermometer className="h-4 w-4 text-orange-500" />
            Clima Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingWeather ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Cargando clima...</span>
            </div>
          ) : errorWeather ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>No disponible</span>
            </div>
          ) : weather ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Temperatura</p>
                <p className="text-2xl font-bold">{weather.temperature}°C</p>
                <p className="text-xs text-muted-foreground">Sens. {weather.feelsLike}°C</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs">{weather.humidity}% humedad</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wind className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs">{weather.windSpeed} m/s</span>
                </div>
                <p className="text-xs text-muted-foreground capitalize">{weather.description}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* NDVI */}
      <Card className="border-l-4 border-l-green-500 bg-green-500/5 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Leaf className="h-4 w-4 text-green-600" />
            Índice NDVI
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingNdvi ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Cargando NDVI...</span>
            </div>
          ) : errorNdvi ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>No disponible</span>
            </div>
          ) : ndvi ? (
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold" style={{ color: ndvi.color }}>
                    {ndvi.ndvi.toFixed(3)}
                  </p>
                  <p className="text-xs text-muted-foreground">{ndvi.interpretacion}</p>
                </div>
                <p className="text-xs text-muted-foreground">{ndvi.fecha}</p>
              </div>
              {/* Barra de color */}
              <div className="relative h-3 overflow-hidden rounded-full bg-secondary">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{ width: `${ndviPercent}%`, backgroundColor: ndvi.color }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>-1 (Agua)</span>
                <span>+1 (Denso)</span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Cobertura del predio */}
      {(areaTotalHa || areaProductivaHa) && (
        <Card className="sm:col-span-2 border-l-4 border-l-primary bg-primary/5 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Leaf className="h-4 w-4 text-primary" />
              Cobertura del Predio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {areaTotalHa && (
                <div>
                  <p className="text-xs text-muted-foreground">Área total</p>
                  <p className="text-lg font-semibold">{areaTotalHa} ha</p>
                </div>
              )}
              {areaProductivaHa && (
                <div>
                  <p className="text-xs text-muted-foreground">Área productiva</p>
                  <p className="text-lg font-semibold">{areaProductivaHa} ha</p>
                </div>
              )}
              {areaTotalHa && areaProductivaHa && (
                <div>
                  <p className="text-xs text-muted-foreground">% Productivo</p>
                  <p className="text-lg font-semibold">
                    {Math.round((areaProductivaHa / areaTotalHa) * 100)}%
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
