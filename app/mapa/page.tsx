"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { AppLayout } from "@/components/app-layout"
import type { MapMarker } from "@/components/map-viewer"

const MapViewer = dynamic(
  () => import("@/components/map-viewer").then((mod) => mod.MapViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Cargando mapa...</span>
        </div>
      </div>
    ),
  }
)

export default function MapaPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading, isAuthenticated } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [markers, setMarkers] = useState<MapMarker[]>([])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }
    setMounted(true)
  }, [authLoading, isAuthenticated, router])

  // Cargar todos los predios registrados vía el endpoint de admin
  // (maneja admin = todos, asesor = los suyos; columnas correctas del schema)
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return

    const loadPredios = async () => {
      try {
        const response = await fetch('/api/admin/caracterizaciones')
        if (!response.ok) {
          console.log("[Mapa] Error loading predios:", response.status)
          return
        }

        const { data } = await response.json()
        if (!data) return

        const mapMarkers: MapMarker[] = []
        const seenPredios = new Set<string>()

        for (const c of data as any[]) {
          const predio = c.predio
          if (!predio?.latitud || !predio?.longitud) continue
          if (seenPredios.has(predio.id)) continue
          seenPredios.add(predio.id)

          const benefNombre = c.beneficiario
            ? `${c.beneficiario.nombres || ''} ${c.beneficiario.apellidos || ''}`.trim()
            : 'Sin nombre'

          // caracterizacion_predio ya viene aplanado como objeto (no array) desde la API
          const temp = c.caracterizacion_predio?.temperatura_celsius

          const popup = `
            <div style="min-width:180px;font-family:system-ui,sans-serif;">
              <strong style="font-size:14px;">${predio.nombre_predio || 'Sin nombre'}</strong>
              <hr style="margin:4px 0;border-color:#e5e7eb;"/>
              <p style="margin:2px 0;font-size:12px;"><b>Productor:</b> ${benefNombre}</p>
              <p style="margin:2px 0;font-size:12px;"><b>Municipio:</b> ${predio.municipio || 'N/A'}</p>
              ${predio.vereda ? `<p style="margin:2px 0;font-size:12px;"><b>Vereda:</b> ${predio.vereda}</p>` : ''}
              ${predio.area_total_hectareas ? `<p style="margin:2px 0;font-size:12px;"><b>Área total:</b> ${predio.area_total_hectareas} ha</p>` : ''}
              ${predio.area_productiva_hectareas ? `<p style="margin:2px 0;font-size:12px;"><b>Área productiva:</b> ${predio.area_productiva_hectareas} ha</p>` : ''}
              ${temp ? `<p style="margin:2px 0;font-size:12px;"><b>Temperatura:</b> ${temp}°C</p>` : ''}
            </div>
          `

          let polygonCoords: [number, number][] | undefined
          if (predio.poligono) {
            try {
              polygonCoords = (typeof predio.poligono === 'string' ? JSON.parse(predio.poligono) : predio.poligono) as [number, number][]
            } catch {
              polygonCoords = undefined
            }
          }

          mapMarkers.push({
            id: predio.id,
            name: predio.nombre_predio || 'Sin nombre',
            position: [predio.latitud, predio.longitud],
            popupContent: popup,
            polygonCoords,
          })
        }

        setMarkers(mapMarkers)
      } catch (err) {
        console.log("[Mapa] Error:", err)
      }
    }

    loadPredios()
  }, [user?.id, isAuthenticated])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Cargando mapa...</span>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="relative flex-1 min-h-0 overflow-hidden rounded-xl border border-border">
        <MapViewer markers={markers} role={profile?.rol as any} />
      </div>
    </AppLayout>
  )
}
