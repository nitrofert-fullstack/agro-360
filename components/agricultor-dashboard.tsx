"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MapPin, Sprout, Loader2, Eye, Calendar, Home,
  LayoutGrid, Map, ChevronRight, Plus, CheckCircle2, XCircle, Clock3,
} from "lucide-react"
import Link from "next/link"
import { staggerContainer, staggerItem } from "@/lib/animations"

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
  id: string; nombre_predio: string; municipio: string; vereda: string
  departamento: string; latitud: string | null; longitud: string | null
  area_total_hectareas: number | null; cultivos_existentes: string | null
}

interface VisitaResumen {
  id: string; radicado_oficial: string | null; radicado_local: string | null
  fecha_visita: string; estado: string; nombre_tecnico: string | null
}

interface PredioCompleto { id: string; predio: Predio; visita: VisitaResumen }

const estadoConfig: Record<string, { label: string; badge: string; cardBorder: string }> = {
  INICIADO:           { label: "Iniciado",          badge: "bg-slate-500/10 text-slate-600 border-slate-500/20",  cardBorder: "border-l-slate-400" },
  REVISADO:           { label: "En Revisión",        badge: "bg-blue-500/10 text-blue-600 border-blue-500/20",    cardBorder: "border-l-blue-500" },
  EN_ESTUDIO_CREDITO: { label: "En Estudio",         badge: "bg-purple-500/10 text-purple-600 border-purple-500/20", cardBorder: "border-l-purple-500" },
  APROBADO:           { label: "Viable",             badge: "bg-green-500/10 text-green-600 border-green-500/20", cardBorder: "border-l-green-500" },
  CANCELADO:          { label: "No Viable",          badge: "bg-red-500/10 text-red-600 border-red-500/20",       cardBorder: "border-l-red-500" },
  SINCRONIZADO:       { label: "Registrado",         badge: "bg-slate-500/10 text-slate-600 border-slate-500/20", cardBorder: "border-l-slate-400" },
  EN_REVISION:        { label: "En Revisión",        badge: "bg-blue-500/10 text-blue-600 border-blue-500/20",    cardBorder: "border-l-blue-500" },
  RECHAZADO:          { label: "No Viable",          badge: "bg-red-500/10 text-red-600 border-red-500/20",       cardBorder: "border-l-red-500" },
}

function fmtFecha(raw: unknown, fallback = 'N/A'): string {
  if (!raw) return fallback
  const s = String(raw)
  const match = s.match(/(\d{4}-\d{2}-\d{2})/)
  if (!match) return fallback
  const d = new Date(match[1] + 'T12:00:00')
  return isNaN(d.getTime()) ? fallback : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })
}

export function AgricultorDashboard({ userEmail, userName, userNumDoc }: { userEmail: string; userName: string; userNumDoc?: string | null }) {
  const router = useRouter()
  const [predios, setPredios] = useState<PredioCompleto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"list" | "map">("list")

  useEffect(() => { loadPredios() }, [userEmail, userNumDoc])

  const loadPredios = async () => {
    const supabase = createClient()
    if (!supabase) return
    try {
      let benefQuery = supabase.from("beneficiarios").select("id")
      benefQuery = userNumDoc ? benefQuery.eq("numero_documento", userNumDoc) : benefQuery.eq("correo", userEmail)
      const { data: beneficiarios } = await benefQuery
      if (!beneficiarios?.length) { setIsLoading(false); return }

      const { data: caracterizaciones } = await supabase
        .from("caracterizaciones")
        .select("id,id_visita,id_predio,id_beneficiario,estado")
        .in("id_beneficiario", beneficiarios.map((b: any) => b.id))
        .order("created_at", { ascending: false })
        .limit(50)

      if (!caracterizaciones?.length) { setIsLoading(false); return }

      const predioIds = [...new Set(caracterizaciones.map((c: any) => c.id_predio))]
      const visitaIds = [...new Set(caracterizaciones.map((c: any) => c.id_visita))]

      const [prediosResult, visitasResult] = await Promise.allSettled([
        supabase.from("predios").select("*").in("id", predioIds),
        supabase.from("visitas").select("id,radicado_oficial,radicado_local,fecha_visita,nombre_tecnico").in("id", visitaIds),
      ])
      const prediosData = prediosResult.status === 'fulfilled' ? prediosResult.value.data : []
      const visitasData = visitasResult.status === 'fulfilled' ? visitasResult.value.data : []

      const result: PredioCompleto[] = caracterizaciones.map((c: any) => {
        const visita = visitasData?.find((v: any) => v.id === c.id_visita)
        return { id: c.id, predio: prediosData?.find((p: any) => p.id === c.id_predio), visita: visita ? { ...visita, estado: c.estado || 'INICIADO' } : null }
      }).filter((r: PredioCompleto) => r.predio && r.visita)

      setPredios(result)
    } catch (err) { console.error("Error cargando predios:", err); setError('Error al cargar los datos. Intente de nuevo.') }
    finally { setIsLoading(false) }
  }

  const prediosConCoords = predios.filter(p => p.predio.latitud && p.predio.longitud)
  const mapCenter: [number, number] = prediosConCoords.length > 0
    ? [
        prediosConCoords.reduce((s, p) => s + parseFloat(p.predio.latitud!), 0) / prediosConCoords.length,
        prediosConCoords.reduce((s, p) => s + parseFloat(p.predio.longitud!), 0) / prediosConCoords.length,
      ]
    : [7.1254, -73.1198]

  const viables  = predios.filter(p => p.visita.estado === 'APROBADO').length
  const revision = predios.filter(p => ['REVISADO','EN_ESTUDIO_CREDITO','EN_REVISION','SINCRONIZADO'].includes(p.visita.estado)).length
  const noViables = predios.filter(p => ['CANCELADO','RECHAZADO'].includes(p.visita.estado)).length
  const canAddNew = predios.length === 0 || predios.every(p => ['CANCELADO','RECHAZADO','APROBADO'].includes(p.visita.estado))

  if (isLoading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando sus terrenos...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <XCircle className="h-10 w-10 text-red-500" />
        <p className="text-sm text-red-600 font-medium">{error}</p>
        <button
          className="text-xs text-muted-foreground underline underline-offset-2"
          onClick={() => { setError(null); setIsLoading(true); loadPredios() }}
        >
          Reintentar
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-5">
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col flex-1 min-h-0 gap-5">

        {/* Hero */}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}>
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-5">
            <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <h2 className="text-lg font-semibold sm:text-xl md:text-2xl truncate">
                  Bienvenido, {userName.split(' ')[0]}
                </h2>
                <p className="text-xs text-muted-foreground hidden sm:block">Información de sus terrenos registrados</p>
                <Badge variant="outline" className="mt-1 w-fit bg-primary/10 text-primary border-primary/20 text-xs">
                  Productor agrícola
                </Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="rounded-lg bg-background/60 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-sm border border-border/40 text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">{predios.length}</p>
                  <p className="text-xs text-muted-foreground">terrenos</p>
                </div>
                {canAddNew && (
                  <Button asChild size="sm" className="gap-1.5 shrink-0 h-10">
                    <Link href="/formulario">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nuevo</span>
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div variants={staggerItem} className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: 'Viables',     value: viables,   icon: CheckCircle2, color: 'text-green-500',  border: 'border-l-green-500',  bg: 'bg-green-500/5' },
            { label: 'En Revisión', value: revision,  icon: Eye,          color: 'text-blue-500',   border: 'border-l-blue-500',   bg: 'bg-blue-500/5' },
            { label: 'No Viables',  value: noViables, icon: XCircle,      color: 'text-red-500',    border: 'border-l-red-500',    bg: 'bg-red-500/5' },
          ].map(({ label, value, icon: Icon, color, border, bg }) => (
            <Card key={label} className={`border-l-4 ${border} ${bg} border-border/60`} style={{boxShadow:'var(--shadow-sm)'}}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
                <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Toggle vista */}
        <motion.div variants={staggerItem} className="flex gap-2">
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")} className="gap-2 min-h-[40px]">
            <LayoutGrid className="h-4 w-4" />
            Lista
          </Button>
          <Button variant={view === "map" ? "default" : "outline"} size="sm" onClick={() => setView("map")} className="gap-2 min-h-[40px]">
            <Map className="h-4 w-4" />
            Mapa
          </Button>
        </motion.div>

        {/* Mapa */}
        {view === "map" && (
          <motion.div variants={staggerItem} className="flex flex-col flex-1 min-h-0">
            {prediosConCoords.length > 0 ? (
              <Card className="border-l-4 border-l-green-500 bg-card/80 border-border/60 overflow-hidden flex flex-col flex-1 min-h-0" style={{boxShadow:'var(--shadow-md)'}}>
                <CardHeader className="pb-2 pt-3 px-4 shrink-0">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-green-600" />
                    Mis Terrenos en el Mapa
                    <Badge variant="outline" className="ml-auto text-xs">{prediosConCoords.length} con ubicación</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0">
                  <div className="h-[400px] md:h-[500px]">
                    <MapViewer
                      initialCenter={mapCenter}
                      initialZoom={prediosConCoords.length === 1 ? 14 : 10}
                      markerPosition={prediosConCoords.length === 1 ? [
                        parseFloat(prediosConCoords[0].predio.latitud!),
                        parseFloat(prediosConCoords[0].predio.longitud!),
                      ] : undefined}
                      minimal={true}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-12 text-center gap-3">
                <MapPin className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Ningún terreno tiene coordenadas registradas</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Lista */}
        {view === "list" && (
          <motion.div variants={staggerItem} className="flex flex-col flex-1 min-h-0 gap-2">
            {predios.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-14 text-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Sprout className="h-8 w-8 text-primary/40" />
                </div>
                <div>
                  <p className="font-semibold">Sin terrenos registrados</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Complete el formulario con ayuda de su asesor</p>
                </div>
                <Button asChild className="mt-1 gap-2" size="sm">
                  <Link href="/formulario"><Plus className="h-4 w-4" />Registrar mi terreno</Link>
                </Button>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
                {predios.map((item, idx) => {
                  const est = estadoConfig[item.visita.estado] || estadoConfig.INICIADO
                  return (
                    <motion.div key={idx} variants={staggerItem} initial="hidden" animate="visible" transition={{ delay: idx * 0.04 }}>
                      <Card
                        className={`cursor-pointer border-l-4 ${est.cardBorder} bg-card/70 border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:bg-card`}
                        style={{boxShadow:'var(--shadow-sm)'}}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'}
                        role="button" tabIndex={0}
                        aria-label={`Ver ${item.predio.nombre_predio || 'terreno'}`}
                        onClick={() => router.push(`/dashboard/caracterizacion/${item.id}`)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/dashboard/caracterizacion/${item.id}`) } }}
                      >
                        <CardContent className="flex items-center gap-3 p-4 min-h-[60px]">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold text-sm">{item.predio.nombre_predio || "Sin nombre"}</p>
                              <Badge variant="outline" className={`shrink-0 text-xs ${est.badge}`}>{est.label}</Badge>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              <span>{item.predio.municipio}{item.predio.vereda ? `, ${item.predio.vereda}` : ''}</span>
                              {item.predio.area_total_hectareas && <span>{item.predio.area_total_hectareas} ha</span>}
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtFecha(item.visita.fecha_visita)}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

      </motion.div>
    </div>
  )
}
