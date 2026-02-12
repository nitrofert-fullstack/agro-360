"use client"

import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard,
  FileText,
  Map,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  MapPin,
  User,
  Phone,
  Calendar,
  Sprout,
  Mountain,
  Wallet,
  ChevronRight,
  RefreshCw,
  Home,
  LogOut,
  Loader2,
} from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import Link from "next/link"

const MapViewer = dynamic(
  () => import("./map-viewer").then((mod) => mod.MapViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Cargando mapa...</span>
        </div>
      </div>
    )
  }
)

// Type from Supabase join query
interface CaracterizacionDB {
  id: string
  radicado_local: string
  radicado_oficial: string | null
  estado: string
  observaciones: string | null
  created_at: string
  updated_at: string
  fecha_sincronizacion: string | null
  firma_beneficiario_url: string | null
  foto_beneficiario_url: string | null
  foto_predio_1_url: string | null
  foto_predio_2_url: string | null
  autoriza_tratamiento_datos: boolean
  // Joined relations
  beneficiario: {
    id: string
    primer_nombre: string
    segundo_nombre: string | null
    primer_apellido: string
    segundo_apellido: string | null
    tipo_documento: string
    numero_documento: string
    telefono: string | null
    email: string | null
    edad: number | null
    ocupacion_principal: string | null
    municipio: string | null
    vereda: string | null
  } | null
  predio: {
    id: string
    nombre_predio: string
    tipo_tenencia: string | null
    area_total: number | null
    area_cultivada: number | null
    latitud: number | null
    longitud: number | null
    altitud: number | null
    departamento: string | null
    municipio: string | null
    vereda: string | null
    codigo_catastral: string | null
    fuente_agua: string | null
    acceso_vial: string | null
    distancia_cabecera: number | null
    vive_en_predio: boolean | null
    tiene_vivienda: boolean | null
    cultivos_existentes: string | null
  } | null
  visita: {
    id: string
    fecha_visita: string | null
    nombre_tecnico: string | null
    objetivo: string | null
    observaciones: string | null
  } | null
  caracterizacion_predio: {
    id: string
    topografia: string | null
    tipo_suelo: string | null
    cobertura_vegetal: string | null
    ruta_acceso: string | null
    distancia_km: number | null
    tiempo_acceso: string | null
    temperatura_celsius: number | null
    meses_lluvia: string | null
  } | null
  area_productiva: {
    id: string
    cultivo_principal: string | null
    area_cultivo_principal: number | null
    produccion_estimada: number | null
    destino_produccion: string | null
    sistema_produccion: string | null
    caracterizacion_cultivo: string | null
    estado_cultivo: string | null
    donde_comercializa: string | null
    ingreso_mensual_ventas: number | null
  } | null
  informacion_financiera: {
    id: string
    ingresos_mensuales: string | null
    ingresos_mensuales_agropecuaria: number | null
    ingresos_mensuales_otros: number | null
    egresos_mensuales: number | null
    activos_totales: number | null
    pasivos_totales: number | null
    acceso_credito: boolean | null
  } | null
  asesor: {
    id: string
    nombre_completo: string | null
    email: string | null
  } | null
}

type EstadoKey = "pendiente" | "sincronizado" | "aprobado" | "rechazado" | "en_revision"

const estadoConfig: Record<EstadoKey, { label: string; color: string; icon: typeof Clock }> = {
  pendiente: { label: "Pendiente", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock },
  sincronizado: { label: "Sincronizado", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Eye },
  en_revision: { label: "En Revision", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Eye },
  aprobado: { label: "Aprobado", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle },
  rechazado: { label: "Rechazado", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
}

export function AdminDashboard() {
  const [caracterizaciones, setCaracterizaciones] = useState<CaracterizacionDB[]>([])
  const [estadisticas, setEstadisticas] = useState({ total: 0, pendientes: 0, sincronizados: 0, aprobados: 0, rechazados: 0 })
  const [selectedCaracterizacion, setSelectedCaracterizacion] = useState<CaracterizacionDB | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [searchQuery, setSearchQuery] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  const supabase = createClient()

  const openWaze = (lat: number, lng: number) => {
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, "_blank")
  }

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank")
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('caracterizaciones')
        .select(`
          *,
          beneficiario:beneficiarios(*),
          predio:predios(*),
          visita:visitas(*),
          caracterizacion_predio:caracterizacion_predio(*),
          area_productiva:area_productiva(*),
          informacion_financiera:informacion_financiera(*),
          asesor:profiles!caracterizaciones_asesor_id_fkey(id, nombre_completo, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const items = (data || []) as unknown as CaracterizacionDB[]
      setCaracterizaciones(items)

      // Stats
      setEstadisticas({
        total: items.length,
        pendientes: items.filter(c => c.estado === 'pendiente').length,
        sincronizados: items.filter(c => c.estado === 'sincronizado').length,
        aprobados: items.filter(c => c.estado === 'aprobado').length,
        rechazados: items.filter(c => c.estado === 'rechazado').length,
      })
    } catch (err) {
      console.error('Error loading data:', err)
      toast.error('Error al cargar datos del servidor')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredCaracterizaciones = caracterizaciones.filter((c) => {
    const matchesEstado = filterEstado === "todos" || c.estado === filterEstado
    const nombre = `${c.beneficiario?.primer_nombre || ''} ${c.beneficiario?.primer_apellido || ''}`.toLowerCase()
    const nombrePredio = (c.predio?.nombre_predio || '').toLowerCase()
    const municipio = (c.predio?.municipio || '').toLowerCase()
    const radicado = (c.radicado_oficial || c.radicado_local || '').toLowerCase()
    const q = searchQuery.toLowerCase()
    const matchesSearch = q === "" || nombre.includes(q) || nombrePredio.includes(q) || municipio.includes(q) || radicado.includes(q)
    return matchesEstado && matchesSearch
  })

  const handleUpdateEstado = async (id: string, nuevoEstado: string) => {
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('caracterizaciones')
        .update({
          estado: nuevoEstado,
          observaciones: observaciones || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      toast.success(`Estado actualizado a "${estadoConfig[nuevoEstado as EstadoKey]?.label || nuevoEstado}"`)
      await loadData()

      // Refresh selected
      if (selectedCaracterizacion?.id === id) {
        const updated = caracterizaciones.find(c => c.id === id)
        if (updated) setSelectedCaracterizacion({ ...updated, estado: nuevoEstado })
      }
    } catch (err) {
      console.error('Error updating estado:', err)
      toast.error('Error al actualizar el estado')
    } finally {
      setIsUpdating(false)
    }
    setObservaciones("")
  }

  const openDetail = (c: CaracterizacionDB) => {
    setSelectedCaracterizacion(c)
    setShowDetail(true)
    setObservaciones(c.observaciones || "")
  }

  const openMapView = (c: CaracterizacionDB) => {
    setSelectedCaracterizacion(c)
    setShowMap(true)
  }

  const getNombreCompleto = (c: CaracterizacionDB) => {
    if (!c.beneficiario) return 'Sin nombre'
    return `${c.beneficiario.primer_nombre || ''} ${c.beneficiario.segundo_nombre || ''} ${c.beneficiario.primer_apellido || ''} ${c.beneficiario.segundo_apellido || ''}`.replace(/\s+/g, ' ').trim() || 'Sin nombre'
  }

  const getEstadoConfig = (estado: string) => {
    return estadoConfig[estado as EstadoKey] || estadoConfig.pendiente
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sprout className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground md:text-xl">AgroSantander360</h1>
              <p className="hidden text-sm text-muted-foreground sm:block">Panel de Administracion</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <Button variant="outline" size="sm" asChild className="h-9 gap-2 bg-transparent px-2 md:px-3">
              <Link href="/dashboard">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => { loadData(); toast.info('Actualizando datos...') }} className="h-9 gap-2 bg-transparent px-2 md:px-3">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden md:inline">Actualizar</span>
            </Button>
            <div className="hidden h-6 w-px bg-border md:block" />
            <Button variant="ghost" size="sm" asChild className="h-9 gap-2 text-muted-foreground hover:text-destructive">
              <Link href="/auth/login">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Stats */}
        <aside className="hidden w-64 border-r border-border bg-card/50 p-4 lg:block">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <LayoutDashboard className="h-4 w-4" />
              Resumen
            </div>

            <div className="space-y-2">
              <Card className="border-border bg-card">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{estadisticas.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                      <Clock className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-500">{estadisticas.pendientes}</p>
                      <p className="text-xs text-muted-foreground">Pendientes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <Eye className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-500">{estadisticas.sincronizados}</p>
                      <p className="text-xs text-muted-foreground">Sincronizados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-500">{estadisticas.aprobados}</p>
                      <p className="text-xs text-muted-foreground">Aprobados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                      <XCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-500">{estadisticas.rechazados}</p>
                      <p className="text-xs text-muted-foreground">Rechazados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, predio, municipio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="sincronizado">Sincronizados</SelectItem>
                  <SelectItem value="aprobado">Aprobados</SelectItem>
                  <SelectItem value="rechazado">Rechazados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredCaracterizaciones.length} resultado(s)
            </p>
          </div>

          {/* Loading */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Cargando caracterizaciones...</span>
              </div>
            </div>
          ) : filteredCaracterizaciones.length === 0 ? (
            <Card className="py-12 text-center">
              <CardContent>
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-medium">No hay caracterizaciones</h3>
                <p className="text-sm text-muted-foreground">
                  {caracterizaciones.length === 0
                    ? "Aun no se han sincronizado caracterizaciones al servidor"
                    : "No se encontraron resultados con los filtros aplicados"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredCaracterizaciones.map((c) => {
                const config = getEstadoConfig(c.estado)
                const Icon = config.icon
                return (
                  <Card key={c.id} className="transition-colors hover:bg-muted/30">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Users className="h-6 w-6 text-primary" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-medium">{getNombreCompleto(c)}</h3>
                          <Badge variant="outline" className={config.color}>
                            <Icon className="mr-1 h-3 w-3" />
                            {config.label}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {c.predio?.nombre_predio || 'Sin predio'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Map className="h-3 w-3" />
                            {c.predio?.municipio || 'Sin municipio'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {c.predio?.latitud && c.predio?.longitud && (
                          <Button variant="outline" size="sm" onClick={() => openMapView(c)} className="gap-1">
                            <Map className="h-4 w-4" />
                            <span className="hidden sm:inline">Mapa</span>
                          </Button>
                        )}
                        <Button variant="default" size="sm" onClick={() => openDetail(c)} className="gap-1">
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">Ver</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Detalle de Caracterizacion
            </DialogTitle>
            <DialogDescription>
              Radicado: {selectedCaracterizacion?.radicado_oficial || selectedCaracterizacion?.radicado_local}
            </DialogDescription>
          </DialogHeader>

          {selectedCaracterizacion && (
            <Tabs defaultValue="general" className="flex-1">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-6">
                <TabsTrigger value="general" className="gap-2">
                  <User className="h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger value="predio" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  Predio
                </TabsTrigger>
                <TabsTrigger value="produccion" className="gap-2">
                  <Sprout className="h-4 w-4" />
                  Produccion
                </TabsTrigger>
                <TabsTrigger value="acciones" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Acciones
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[60vh]">
                <TabsContent value="general" className="m-0 p-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <User className="h-4 w-4 text-primary" />
                          Informacion del Productor
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nombre:</span>
                          <span className="font-medium">{getNombreCompleto(selectedCaracterizacion)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Documento:</span>
                          <span className="font-medium">{selectedCaracterizacion.beneficiario?.tipo_documento} {selectedCaracterizacion.beneficiario?.numero_documento}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Edad:</span>
                          <span>{selectedCaracterizacion.beneficiario?.edad || 'No especificada'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ocupacion:</span>
                          <span>{selectedCaracterizacion.beneficiario?.ocupacion_principal || 'No especificada'}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Phone className="h-4 w-4 text-primary" />
                          Contacto
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Telefono:</span>
                          <span className="font-medium">{selectedCaracterizacion.beneficiario?.telefono || 'No registrado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Correo:</span>
                          <span>{selectedCaracterizacion.beneficiario?.email || 'No registrado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Municipio:</span>
                          <span>{selectedCaracterizacion.predio?.municipio || 'No especificado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vereda:</span>
                          <span>{selectedCaracterizacion.predio?.vereda || 'No especificada'}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Calendar className="h-4 w-4 text-primary" />
                          Registro
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tecnico:</span>
                          <span className="font-medium">{selectedCaracterizacion.visita?.nombre_tecnico || selectedCaracterizacion.asesor?.nombre_completo || 'No registrado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fecha visita:</span>
                          <span>{selectedCaracterizacion.visita?.fecha_visita ? new Date(selectedCaracterizacion.visita.fecha_visita).toLocaleDateString() : 'No registrada'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sincronizado:</span>
                          <span>{selectedCaracterizacion.fecha_sincronizacion ? new Date(selectedCaracterizacion.fecha_sincronizacion).toLocaleDateString() : 'Pendiente'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Estado:</span>
                          <Badge variant="outline" className={getEstadoConfig(selectedCaracterizacion.estado).color}>
                            {getEstadoConfig(selectedCaracterizacion.estado).label}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Fotos */}
                    {(selectedCaracterizacion.foto_beneficiario_url || selectedCaracterizacion.foto_predio_1_url) && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Evidencia Fotografica</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                          {selectedCaracterizacion.foto_beneficiario_url && (
                            <img src={selectedCaracterizacion.foto_beneficiario_url} alt="Beneficiario" className="h-24 w-24 rounded-md object-cover" />
                          )}
                          {selectedCaracterizacion.foto_predio_1_url && (
                            <img src={selectedCaracterizacion.foto_predio_1_url} alt="Predio 1" className="h-24 w-24 rounded-md object-cover" />
                          )}
                          {selectedCaracterizacion.foto_predio_2_url && (
                            <img src={selectedCaracterizacion.foto_predio_2_url} alt="Predio 2" className="h-24 w-24 rounded-md object-cover" />
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="predio" className="m-0 p-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <MapPin className="h-4 w-4 text-primary" />
                          Datos del Predio
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nombre:</span>
                          <span className="font-medium">{selectedCaracterizacion.predio?.nombre_predio || 'Sin nombre'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Area Total:</span>
                          <span>{selectedCaracterizacion.predio?.area_total ? `${selectedCaracterizacion.predio.area_total} ha` : 'No registrada'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Area Cultivada:</span>
                          <span>{selectedCaracterizacion.predio?.area_cultivada ? `${selectedCaracterizacion.predio.area_cultivada} ha` : 'No registrada'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tenencia:</span>
                          <span>{selectedCaracterizacion.predio?.tipo_tenencia || 'No especificada'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Altitud:</span>
                          <span>{selectedCaracterizacion.predio?.altitud ? `${selectedCaracterizacion.predio.altitud} msnm` : 'No registrada'}</span>
                        </div>
                        {selectedCaracterizacion.predio?.latitud && selectedCaracterizacion.predio?.longitud && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Coordenadas:</span>
                            <span className="font-mono text-xs">
                              {selectedCaracterizacion.predio.latitud.toFixed(5)}, {selectedCaracterizacion.predio.longitud.toFixed(5)}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Mountain className="h-4 w-4 text-primary" />
                          Caracteristicas del Predio
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Topografia:</span>
                          <span>{selectedCaracterizacion.caracterizacion_predio?.topografia || 'No especificada'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cobertura vegetal:</span>
                          <span>{selectedCaracterizacion.caracterizacion_predio?.cobertura_vegetal || 'No especificada'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Acceso vial:</span>
                          <span>{selectedCaracterizacion.predio?.acceso_vial || selectedCaracterizacion.caracterizacion_predio?.ruta_acceso || 'No especificado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Distancia cabecera:</span>
                          <span>{selectedCaracterizacion.predio?.distancia_cabecera ? `${selectedCaracterizacion.predio.distancia_cabecera} km` : 'No registrada'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vive en predio:</span>
                          <span>{selectedCaracterizacion.predio?.vive_en_predio ? 'Si' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cultivos existentes:</span>
                          <span>{selectedCaracterizacion.predio?.cultivos_existentes || 'No especificados'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="produccion" className="m-0 p-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Sprout className="h-4 w-4 text-primary" />
                          Area Productiva
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cultivo principal:</span>
                          <span className="font-medium">{selectedCaracterizacion.area_productiva?.cultivo_principal || 'No registrado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Area:</span>
                          <span>{selectedCaracterizacion.area_productiva?.area_cultivo_principal ? `${selectedCaracterizacion.area_productiva.area_cultivo_principal} ha` : 'No registrada'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estado del cultivo:</span>
                          <span>{selectedCaracterizacion.area_productiva?.estado_cultivo || 'No especificado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Destino produccion:</span>
                          <span>{selectedCaracterizacion.area_productiva?.destino_produccion || 'No especificado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Donde comercializa:</span>
                          <span>{selectedCaracterizacion.area_productiva?.donde_comercializa || 'No especificado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ingreso mensual:</span>
                          <span>{selectedCaracterizacion.area_productiva?.ingreso_mensual_ventas ? `$${Number(selectedCaracterizacion.area_productiva.ingreso_mensual_ventas).toLocaleString()}` : 'No registrado'}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Wallet className="h-4 w-4 text-primary" />
                          Informacion Financiera
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ingresos agropecuaria:</span>
                          <span>{selectedCaracterizacion.informacion_financiera?.ingresos_mensuales_agropecuaria ? `$${Number(selectedCaracterizacion.informacion_financiera.ingresos_mensuales_agropecuaria).toLocaleString()}` : 'No registrado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Otros ingresos:</span>
                          <span>{selectedCaracterizacion.informacion_financiera?.ingresos_mensuales_otros ? `$${Number(selectedCaracterizacion.informacion_financiera.ingresos_mensuales_otros).toLocaleString()}` : 'No registrado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Egresos:</span>
                          <span>{selectedCaracterizacion.informacion_financiera?.egresos_mensuales ? `$${Number(selectedCaracterizacion.informacion_financiera.egresos_mensuales).toLocaleString()}` : 'No registrado'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Acceso credito:</span>
                          <span>{selectedCaracterizacion.informacion_financiera?.acceso_credito ? 'Si' : 'No'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="acciones" className="m-0 p-6">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Cambiar Estado</CardTitle>
                        <CardDescription>Actualice el estado de la caracterizacion</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {(["pendiente", "sincronizado", "en_revision", "aprobado", "rechazado"] as const).map((est) => {
                            const cfg = estadoConfig[est]
                            const EstIcon = cfg.icon
                            const isCurrent = selectedCaracterizacion.estado === est
                            return (
                              <Button
                                key={est}
                                variant={isCurrent ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleUpdateEstado(selectedCaracterizacion.id, est)}
                                disabled={isUpdating || isCurrent}
                                className={`gap-2 ${est === 'aprobado' && !isCurrent ? 'hover:bg-green-600 hover:text-white' : ''} ${est === 'rechazado' && !isCurrent ? 'hover:bg-red-600 hover:text-white' : ''}`}
                              >
                                <EstIcon className="h-4 w-4" />
                                {cfg.label}
                              </Button>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Observaciones</CardTitle>
                        <CardDescription>Agregue notas o comentarios sobre la caracterizacion</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Textarea
                          placeholder="Escriba sus observaciones aqui..."
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          rows={4}
                        />
                        <Button
                          onClick={async () => {
                            try {
                              await supabase
                                .from('caracterizaciones')
                                .update({ observaciones, updated_at: new Date().toISOString() })
                                .eq('id', selectedCaracterizacion.id)
                              toast.success('Observaciones guardadas')
                              await loadData()
                            } catch {
                              toast.error('Error al guardar observaciones')
                            }
                          }}
                          className="gap-2"
                          disabled={isUpdating}
                        >
                          Guardar Observaciones
                        </Button>
                        {selectedCaracterizacion.observaciones && (
                          <div className="rounded-lg bg-muted p-3">
                            <p className="text-sm font-medium">Observaciones guardadas:</p>
                            <p className="mt-1 text-sm text-muted-foreground">{selectedCaracterizacion.observaciones}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {selectedCaracterizacion.predio?.latitud && selectedCaracterizacion.predio?.longitud && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Ver en Mapa</CardTitle>
                          <CardDescription>Analice la ubicacion con capas NDVI, satelital y clima</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button
                            onClick={() => {
                              setShowDetail(false)
                              setTimeout(() => openMapView(selectedCaracterizacion), 100)
                            }}
                            className="gap-2"
                          >
                            <Map className="h-4 w-4" />
                            Abrir Vista de Mapa
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Map Dialog */}
      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent
          className="h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 p-0 sm:max-w-none md:h-[90vh] md:max-h-[90vh] md:w-[95vw] md:max-w-[1400px] md:rounded-lg md:border"
          showCloseButton={false}
        >
          <div className="sr-only">
            <DialogTitle>Mapa del Predio</DialogTitle>
            <DialogDescription>Visualizacion del mapa del predio seleccionado</DialogDescription>
          </div>
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Map className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground md:text-base">
                  {selectedCaracterizacion?.predio?.nombre_predio || 'Predio'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedCaracterizacion && getNombreCompleto(selectedCaracterizacion!)} - {selectedCaracterizacion?.predio?.municipio || ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedCaracterizacion?.predio?.latitud && selectedCaracterizacion?.predio?.longitud && (
                <>
                  <button
                    onClick={() => openWaze(selectedCaracterizacion!.predio!.latitud!, selectedCaracterizacion!.predio!.longitud!)}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-all hover:bg-secondary md:px-3"
                    title="Abrir en Waze"
                  >
                    <span className="hidden sm:inline">Waze</span>
                    <MapPin className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openGoogleMaps(selectedCaracterizacion!.predio!.latitud!, selectedCaracterizacion!.predio!.longitud!)}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-all hover:bg-secondary md:px-3"
                    title="Abrir en Google Maps"
                  >
                    <span className="hidden sm:inline">Maps</span>
                    <MapPin className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => setShowMap(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="h-[calc(100dvh-60px)] w-full md:h-[calc(90vh-60px)]">
            {selectedCaracterizacion?.predio?.latitud && selectedCaracterizacion?.predio?.longitud && showMap && (
              <MapViewer
                initialCenter={[selectedCaracterizacion.predio.latitud, selectedCaracterizacion.predio.longitud]}
                initialZoom={14}
                markerPosition={[selectedCaracterizacion.predio.latitud, selectedCaracterizacion.predio.longitud]}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
