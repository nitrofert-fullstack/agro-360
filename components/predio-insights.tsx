"use client"

import { useEffect, useState } from "react"
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
      .then((d) => { if (d.error) throw new Error(d.error); setWeather(d) })
      .catch((e) => setErrorWeather(e.message))
      .finally(() => setLoadingWeather(false))
  }, [lat, lng])

  useEffect(() => {
    setLoadingNdvi(true)
    fetch(`/api/ndvi?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setNdvi(d) })
      .catch((e) => setErrorNdvi(e.message))
      .finally(() => setLoadingNdvi(false))
  }, [lat, lng])

  const ndviPercent = ndvi ? Math.max(0, Math.min(100, ((ndvi.ndvi + 1) / 2) * 100)) : 0

  return (
    <div className="space-y-3">
      {/* Clima */}
      <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Thermometer className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-xs font-semibold text-foreground">Clima Actual</span>
        </div>
        {loadingWeather ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">Cargando...</span>
          </div>
        ) : errorWeather ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
            <span>No disponible</span>
          </div>
        ) : weather ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xl font-bold">{weather.temperature}°C</p>
              <p className="text-xs text-muted-foreground">Sensación {weather.feelsLike}°C</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Droplets className="h-3 w-3 text-blue-500" />
                <span className="text-xs">{weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind className="h-3 w-3 text-slate-400" />
                <span className="text-xs">{weather.windSpeed} m/s</span>
              </div>
              <p className="text-xs text-muted-foreground capitalize">{weather.description}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* NDVI */}
      <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Leaf className="h-3.5 w-3.5 text-green-600" />
          <span className="text-xs font-semibold text-foreground">Índice NDVI</span>
        </div>
        {loadingNdvi ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">Cargando...</span>
          </div>
        ) : errorNdvi ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
            <span>No disponible</span>
          </div>
        ) : ndvi ? (
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xl font-bold" style={{ color: ndvi.color }}>{ndvi.ndvi.toFixed(3)}</p>
                <p className="text-xs text-muted-foreground">{ndvi.interpretacion}</p>
              </div>
              <p className="text-xs text-muted-foreground">{ndvi.fecha}</p>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-secondary">
              <div className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{ width: `${ndviPercent}%`, backgroundColor: ndvi.color }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>-1 Agua</span><span>+1 Denso</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Cobertura */}
      {(areaTotalHa || areaProductivaHa) && (
        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Cobertura del Predio</span>
          </div>
          <div className="flex gap-4 flex-wrap">
            {areaTotalHa && (
              <div>
                <p className="text-xs text-muted-foreground">Área total</p>
                <p className="font-semibold text-sm">{areaTotalHa} ha</p>
              </div>
            )}
            {areaProductivaHa && (
              <div>
                <p className="text-xs text-muted-foreground">Área productiva</p>
                <p className="font-semibold text-sm">{areaProductivaHa} ha</p>
              </div>
            )}
            {areaTotalHa && areaProductivaHa && (
              <div>
                <p className="text-xs text-muted-foreground">% Productivo</p>
                <p className="font-semibold text-sm">{Math.round((areaProductivaHa / areaTotalHa) * 100)}%</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
