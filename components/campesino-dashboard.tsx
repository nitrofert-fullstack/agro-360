"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Leaf,
  MapPin,
  Sprout,
  Droplets,
  Loader2,
  Eye,
  Calendar,
  Home,
  LayoutGrid,
  Map,
  ChevronRight,
} from "lucide-react"

const MapViewer = dynamic(
  () => import("@/components/map-viewer").then((mod) => mod.MapViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center bg-muted rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
)

interface Predio {
  id: string
  nombre_predio: string
  municipio: string
  vereda: string
  departamento: string
  latitud: string | null
  longitud: string | null
  area_total_hectareas: number | null
  cultivos_existentes: string | null
}

interface VisitaResumen {
  id: string
  radicado_oficial: string | null
  radicado_local: string | null
  fecha_visita: string
  estado: string
  nombre_tecnico: string | null
}

interface PredioCompleto {
  predio: Predio
  visita: VisitaResumen
}

const estadoConfig: Record<string, { label: string; color: string }> = {
  SINCRONIZADO: { label: "Sincronizado", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  EN_REVISION: { label: "En Revision", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  APROBADO: { label: "Aprobado", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  RECHAZADO: { label: "Rechazado", color: "bg-red-500/10 text-red-600 border-red-500/20" },
}

export function CampesinoDashboard({ userEmail, userName }: { userEmail: string; userName: string }) {
  const router = useRouter()
  const [predios, setPredios] = useState<PredioCompleto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<"list" | "map">("list")

  useEffect(() => {
    loadPredios()
  }, [userEmail])

  const loadPredios = async () => {
    const supabase = createClient()
    if (!supabase) return

    try {
      // Buscar beneficiarios por email
      const { data: beneficiarios } = await supabase
        .from("beneficiarios")
        .select("id")
        .eq("correo", userEmail)

      if (!beneficiarios || beneficiarios.length === 0) {
        setIsLoading(false)
        return
      }

      const beneficiarioIds = beneficiarios.map((b: any) => b.id)

      // Buscar caracterizaciones con esos beneficiarios
      const { data: caracterizaciones } = await supabase
        .from("caracterizaciones")
        .select(`
          id,
          id_visita,
          id_predio,
          id_beneficiario,
          foto_1_url,
          foto_2_url
        `)
        .in("id_beneficiario", beneficiarioIds)

      if (!caracterizaciones || caracterizaciones.length === 0) {
        setIsLoading(false)
        return
      }

      // Obtener predios y visitas
      const predioIds = [...new Set(caracterizaciones.map((c: any) => c.id_predio))]
      const visitaIds = [...new Set(caracterizaciones.map((c: any) => c.id_visita))]

      const [{ data: prediosData }, { data: visitasData }] = await Promise.all([
        supabase.from("predios").select("*").in("id", predioIds),
        supabase.from("visitas").select("*").in("id", visitaIds),
      ])

      const result: PredioCompleto[] = caracterizaciones.map((c: any) => ({
        predio: prediosData?.find((p: any) => p.id === c.id_predio),
        visita: visitasData?.find((v: any) => v.id === c.id_visita),
      })).filter((r: PredioCompleto) => r.predio && r.visita)

      setPredios(result)
    } catch (err) {
      console.error("Error cargando predios:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Calcular el centro del mapa basado en todos los predios con coordenadas
  const prediosConCoords = predios.filter(
    (p) => p.predio.latitud && p.predio.longitud
  )
  const mapCenter: [number, number] = prediosConCoords.length > 0
    ? [
        prediosConCoords.reduce((sum, p) => sum + parseFloat(p.predio.latitud!), 0) / prediosConCoords.length,
        prediosConCoords.reduce((sum, p) => sum + parseFloat(p.predio.longitud!), 0) / prediosConCoords.length,
      ]
    : [7.1254, -73.1198]

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando sus terrenos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome + Stats */}
      <div>
        <h2 className="text-xl font-bold md:text-2xl">Bienvenido, {userName}</h2>
        <p className="text-sm text-muted-foreground">
          Aqui puede ver la informacion de sus terrenos registrados
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Home className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{predios.length}</p>
              <p className="text-xs text-muted-foreground">Terrenos Registrados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Sprout className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">
                {predios.filter((p) => p.visita.estado === "APROBADO").length}
              </p>
              <p className="text-xs text-muted-foreground">Aprobados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Eye className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">
                {predios.filter((p) => p.visita.estado === "EN_REVISION" || p.visita.estado === "SINCRONIZADO").length}
              </p>
              <p className="text-xs text-muted-foreground">En Revision</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={view === "list" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("list")}
          className="gap-2"
        >
          <LayoutGrid className="h-4 w-4" />
          Lista
        </Button>
        <Button
          variant={view === "map" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("map")}
          className="gap-2"
        >
          <Map className="h-4 w-4" />
          Mapa General
        </Button>
      </div>

      {/* Map view */}
      {view === "map" && prediosConCoords.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5 text-primary" />
              Mis Terrenos en el Mapa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-0">
            <div className="h-[500px] md:h-[600px]">
              <MapViewer
                initialCenter={mapCenter}
                initialZoom={prediosConCoords.length === 1 ? 14 : 10}
                markerPosition={prediosConCoords.length === 1 ? [
                  parseFloat(prediosConCoords[0].predio.latitud!),
                  parseFloat(prediosConCoords[0].predio.longitud!),
                ] : undefined}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="space-y-3">
          {predios.length === 0 ? (
            <Card className="py-12 text-center">
              <CardContent>
                <Sprout className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground">No tiene terrenos registrados aun</p>
              </CardContent>
            </Card>
          ) : (
            predios.map((item, idx) => {
              const est = estadoConfig[item.visita.estado] || estadoConfig.SINCRONIZADO
              const hasCoords = item.predio.latitud && item.predio.longitud

              return (
                <Card
                  key={idx}
                  className="cursor-pointer transition-colors hover:bg-muted/30"
                  onClick={() => router.push(`/dashboard/caracterizacion/${item.visita.id}`)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">
                          {item.predio.nombre_predio || "Sin nombre"}
                        </p>
                        <Badge variant="outline" className={est.color}>{est.label}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>{item.predio.municipio}, {item.predio.vereda}</span>
                        {item.predio.area_total_hectareas && (
                          <span>{item.predio.area_total_hectareas} ha</span>
                        )}
                        {item.predio.cultivos_existentes && (
                          <span className="truncate max-w-[200px]">{item.predio.cultivos_existentes}</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Visita: {item.visita.fecha_visita
                            ? new Date(item.visita.fecha_visita).toLocaleDateString("es-CO")
                            : "N/A"}
                        </span>
                        {item.visita.radicado_oficial && (
                          <span className="font-mono">{item.visita.radicado_oficial}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
