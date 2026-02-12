"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Home, Loader2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
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

interface PredioMarkerData {
  id: string
  nombre_predio: string
  municipio: string | null
  vereda: string | null
  latitud: number | null
  longitud: number | null
  area_total: number | null
  area_cultivada: number | null
  beneficiario_nombre: string
  temperatura: number | null
}

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

  // Cargar predios del asesor
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return

    const loadPredios = async () => {
      const supabase = createClient()
      try {
        // Obtener caracterizaciones del asesor con datos del predio y beneficiario
        const { data, error } = await supabase
          .from('caracterizaciones')
          .select(`
            id,
            predio:predios!id_predio(id, nombre_predio, municipio, vereda, latitud, longitud, area_total, area_cultivada),
            beneficiario:beneficiarios!id_beneficiario(primer_nombre, primer_apellido),
            caracterizacion_predio:caracterizacion_predio(temperatura_celsius)
          `)
          .eq('asesor_id', user.id)

        if (error) {
          console.log("[Mapa] Error loading predios:", error)
          return
        }

        if (!data) return

        const mapMarkers: MapMarker[] = []
        const seenPredios = new Set<string>()

        for (const c of data as any[]) {
          const predio = c.predio
          if (!predio?.latitud || !predio?.longitud) continue
          if (seenPredios.has(predio.id)) continue
          seenPredios.add(predio.id)

          const benefNombre = c.beneficiario
            ? `${c.beneficiario.primer_nombre || ''} ${c.beneficiario.primer_apellido || ''}`.trim()
            : 'Sin nombre'

          const temp = c.caracterizacion_predio?.temperatura_celsius

          const popup = `
            <div style="min-width:180px;font-family:system-ui,sans-serif;">
              <strong style="font-size:14px;">${predio.nombre_predio || 'Sin nombre'}</strong>
              <hr style="margin:4px 0;border-color:#e5e7eb;"/>
              <p style="margin:2px 0;font-size:12px;"><b>Productor:</b> ${benefNombre}</p>
              <p style="margin:2px 0;font-size:12px;"><b>Municipio:</b> ${predio.municipio || 'N/A'}</p>
              ${predio.vereda ? `<p style="margin:2px 0;font-size:12px;"><b>Vereda:</b> ${predio.vereda}</p>` : ''}
              ${predio.area_total ? `<p style="margin:2px 0;font-size:12px;"><b>Area total:</b> ${predio.area_total} ha</p>` : ''}
              ${predio.area_cultivada ? `<p style="margin:2px 0;font-size:12px;"><b>Area cultivada:</b> ${predio.area_cultivada} ha</p>` : ''}
              ${temp ? `<p style="margin:2px 0;font-size:12px;"><b>Temperatura:</b> ${temp}°C</p>` : ''}
            </div>
          `

          mapMarkers.push({
            id: predio.id,
            position: [predio.latitud, predio.longitud],
            popupContent: popup,
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
      <main className="relative h-screen w-screen overflow-hidden bg-background">
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Cargando mapa...</span>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      <MapViewer markers={markers} />

      {/* Marker count badge */}
      {markers.length > 0 && (
        <div className="absolute left-3 top-3 z-[1002] rounded-lg border border-border bg-card/95 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-md">
          {markers.length} predio{markers.length !== 1 ? 's' : ''} registrado{markers.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Navigation controls */}
      <div className="absolute bottom-3 left-3 z-[1002] flex items-center gap-2 md:bottom-4">
        <Link
          href="/dashboard"
          className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card/95 px-2.5 text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-secondary hover:text-foreground md:h-9 md:gap-2 md:px-3"
          aria-label="Volver al Dashboard"
        >
          <Home className="h-4 w-4" />
          <span className="hidden text-xs font-medium sm:inline md:text-sm">Dashboard</span>
        </Link>
        <ThemeToggle />
      </div>
    </main>
  )
}
