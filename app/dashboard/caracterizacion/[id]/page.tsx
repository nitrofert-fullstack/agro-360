"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/hooks/use-auth"
import {
  getCaracterizacionByRadicado,
  type CaracterizacionLocal,
} from "@/lib/db/indexed-db"
import {
  Leaf,
  ArrowLeft,
  User,
  MapPin,
  FileText,
  Droplets,
  AlertTriangle,
  Sprout,
  DollarSign,
  Camera,
  PenTool,
  Calendar,
  Clock,
  CheckCircle,
  Loader2,
  Mountain,
  Thermometer,
  Eye,
  ImageIcon,
} from "lucide-react"

const MapViewer = dynamic(
  () => import("@/components/map-viewer").then((mod) => mod.MapViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-lg bg-muted">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Cargando mapa...</span>
        </div>
      </div>
    ),
  }
)

interface ServerData {
  visita: any
  caracterizacion: any
  beneficiario: any
  predio: any
  caracterizacionPredio: any
  abastecimientoAgua: any
  riesgosPredio: any
  areaProductiva: any
  infoFinanciera: any
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{String(value)}</p>
    </div>
  )
}

function BooleanTag({ label, active }: { label: string; active: boolean | null | undefined }) {
  if (!active) return null
  return (
    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
      {label}
    </Badge>
  )
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function CaracterizacionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { loading: authLoading, isAuthenticated } = useAuth()
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [localData, setLocalData] = useState<CaracterizacionLocal | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<"server" | "local" | null>(null)
  const [photoModal, setPhotoModal] = useState<string | null>(null)

  const id = params.id as string

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.push("/auth/login")
      return
    }
    loadData()
  }, [id, authLoading, isAuthenticated])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Intentar cargar del servidor primero
      const res = await fetch(`/api/caracterizacion/${encodeURIComponent(id)}`)
      if (res.ok) {
        const data = await res.json()
        setServerData(data)
        setSource("server")
        setIsLoading(false)
        return
      }
    } catch {
      // Si falla el servidor, intentar local
    }

    // Intentar cargar de IndexedDB
    try {
      const local = await getCaracterizacionByRadicado(id)
      if (local) {
        setLocalData(local)
        setSource("local")
        setIsLoading(false)
        return
      }
    } catch {
      // ignore
    }

    setError("No se encontro la caracterizacion")
    setIsLoading(false)
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando caracterizacion...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-semibold">Error</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
        </Button>
      </div>
    )
  }

  // Renderizar datos del servidor
  if (source === "server" && serverData) {
    return <ServerDetailView data={serverData} photoModal={photoModal} setPhotoModal={setPhotoModal} />
  }

  // Renderizar datos locales
  if (source === "local" && localData) {
    return <LocalDetailView data={localData} photoModal={photoModal} setPhotoModal={setPhotoModal} />
  }

  return null
}

// ==================== SERVER DETAIL VIEW ====================
function ServerDetailView({
  data,
  photoModal,
  setPhotoModal,
}: {
  data: ServerData
  photoModal: string | null
  setPhotoModal: (url: string | null) => void
}) {
  const router = useRouter()
  const { visita, caracterizacion, beneficiario, predio, caracterizacionPredio, abastecimientoAgua, riesgosPredio, areaProductiva, infoFinanciera } = data

  const nombre = beneficiario
    ? `${beneficiario.nombres || ""} ${beneficiario.apellidos || ""}`.trim()
    : "Sin nombre"

  const lat = predio?.latitud ? parseFloat(predio.latitud) : null
  const lng = predio?.longitud ? parseFloat(predio.longitud) : null
  const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)

  const photos = [
    { label: "Foto 1", url: caracterizacion?.foto_1_url },
    { label: "Foto 2", url: caracterizacion?.foto_2_url },
  ].filter((p) => p.url)

  const firma = caracterizacion?.firma_productor_url

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Leaf className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold md:text-base">Detalle Caracterizacion</h1>
                <p className="text-xs text-muted-foreground font-mono">
                  {visita?.radicado_oficial || visita?.radicado_local}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle className="mr-1 h-3 w-3" />
              Sincronizado
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* Resumen rapido */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <User className="h-8 w-8 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Productor</p>
                <p className="truncate text-sm font-semibold">{nombre}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <MapPin className="h-8 w-8 text-green-600" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Predio</p>
                <p className="truncate text-sm font-semibold">{predio?.nombre_predio || "Sin nombre"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Fecha visita</p>
                <p className="text-sm font-semibold">
                  {visita?.fecha_visita
                    ? new Date(visita.fecha_visita).toLocaleDateString("es-CO")
                    : "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <FileText className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Tecnico</p>
                <p className="text-sm font-semibold">{visita?.nombre_tecnico || "N/A"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mapa */}
        {hasCoords && (
          <Card className="mb-6 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5 text-primary" />
                Ubicacion del Predio
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {lat!.toFixed(6)}, {lng!.toFixed(6)}
                  {predio?.altitud_msnm && ` | ${predio.altitud_msnm} msnm`}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px] md:h-[500px]">
                <MapViewer
                  initialCenter={[lat!, lng!]}
                  initialZoom={14}
                  markerPosition={[lat!, lng!]}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Beneficiario */}
          <SectionCard title="Datos del Beneficiario" icon={User}>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Nombre completo" value={nombre} />
              <InfoRow label="Tipo documento" value={beneficiario?.tipo_documento} />
              <InfoRow label="No. documento" value={beneficiario?.numero_documento} />
              <InfoRow label="Edad" value={beneficiario?.edad} />
              <InfoRow label="Telefono" value={beneficiario?.telefono} />
              <InfoRow label="Correo" value={beneficiario?.correo} />
              <InfoRow label="Ocupacion principal" value={beneficiario?.ocupacion_principal} />
            </div>
          </SectionCard>

          {/* Predio */}
          <SectionCard title="Datos del Predio" icon={MapPin}>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Nombre predio" value={predio?.nombre_predio} />
              <InfoRow label="Departamento" value={predio?.departamento} />
              <InfoRow label="Municipio" value={predio?.municipio} />
              <InfoRow label="Vereda" value={predio?.vereda} />
              <InfoRow label="Direccion" value={predio?.direccion} />
              <InfoRow label="Tipo tenencia" value={predio?.tipo_tenencia} />
              <InfoRow label="Documento tenencia" value={predio?.documento_tenencia} />
              <InfoRow label="Codigo catastral" value={predio?.codigo_catastral} />
              <InfoRow label="Area total (ha)" value={predio?.area_total_hectareas} />
              <InfoRow label="Area productiva (ha)" value={predio?.area_productiva_hectareas} />
              <InfoRow label="Vive en predio" value={predio?.vive_en_predio} />
              <InfoRow label="Tiene vivienda" value={predio?.tiene_vivienda ? "Si" : "No"} />
              <InfoRow label="Cultivos existentes" value={predio?.cultivos_existentes} />
            </div>
          </SectionCard>

          {/* Caracterizacion predio */}
          {caracterizacionPredio && (
            <SectionCard title="Caracterizacion del Predio" icon={Mountain}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Topografia" value={caracterizacionPredio.topografia} />
                <InfoRow label="Ruta acceso" value={caracterizacionPredio.ruta_acceso} />
                <InfoRow label="Distancia (km)" value={caracterizacionPredio.distancia_km} />
                <InfoRow label="Tiempo acceso" value={caracterizacionPredio.tiempo_acceso} />
                <InfoRow label="Temperatura (°C)" value={caracterizacionPredio.temperatura_celsius} />
                <InfoRow label="Meses lluvia" value={caracterizacionPredio.meses_lluvia} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <BooleanTag label="Bosque" active={caracterizacionPredio.cobertura_bosque} />
                <BooleanTag label="Cultivos" active={caracterizacionPredio.cobertura_cultivos} />
                <BooleanTag label="Pastos" active={caracterizacionPredio.cobertura_pastos} />
                <BooleanTag label="Rastrojo" active={caracterizacionPredio.cobertura_rastrojo} />
              </div>
            </SectionCard>
          )}

          {/* Abastecimiento Agua */}
          {abastecimientoAgua && (
            <SectionCard title="Abastecimiento de Agua" icon={Droplets}>
              <div className="flex flex-wrap gap-2">
                <BooleanTag label="Nacimiento / Manantial" active={abastecimientoAgua.nacimiento_manantial} />
                <BooleanTag label="Rio / Quebrada" active={abastecimientoAgua.rio_quebrada} />
                <BooleanTag label="Pozo" active={abastecimientoAgua.pozo} />
                <BooleanTag label="Acueducto rural" active={abastecimientoAgua.acueducto_rural} />
                <BooleanTag label="Canal distrito riego" active={abastecimientoAgua.canal_distrito_riego} />
                <BooleanTag label="Jagüey / Reservorio" active={abastecimientoAgua.jaguey_reservorio} />
                <BooleanTag label="Agua lluvia" active={abastecimientoAgua.agua_lluvia} />
              </div>
              <InfoRow label="Otra fuente" value={abastecimientoAgua.otra_fuente} />
            </SectionCard>
          )}

          {/* Riesgos */}
          {riesgosPredio && (
            <SectionCard title="Riesgos del Predio" icon={AlertTriangle}>
              <div className="flex flex-wrap gap-2">
                <BooleanTag label="Inundacion" active={riesgosPredio.inundacion} />
                <BooleanTag label="Sequia" active={riesgosPredio.sequia} />
                <BooleanTag label="Viento" active={riesgosPredio.viento} />
                <BooleanTag label="Helada" active={riesgosPredio.helada} />
              </div>
              {riesgosPredio.otros_riesgos && (
                <div className="mt-3">
                  <InfoRow label="Otros riesgos" value={riesgosPredio.otros_riesgos} />
                </div>
              )}
            </SectionCard>
          )}

          {/* Area Productiva */}
          {areaProductiva && (
            <SectionCard title="Area Productiva" icon={Sprout}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Sistema productivo" value={areaProductiva.sistema_productivo} />
                <InfoRow label="Caracterizacion cultivo" value={areaProductiva.caracterizacion_cultivo} />
                <InfoRow label="Cantidad produccion" value={areaProductiva.cantidad_produccion} />
                <InfoRow label="Estado cultivo" value={areaProductiva.estado_cultivo} />
                <InfoRow label="Infraestructura procesamiento" value={areaProductiva.tiene_infraestructura_procesamiento ? "Si" : "No"} />
                <InfoRow label="Estructuras" value={areaProductiva.estructuras} />
                <InfoRow label="Interesado en programa" value={areaProductiva.interesado_programa ? "Si" : "No"} />
                <InfoRow label="Donde comercializa" value={areaProductiva.donde_comercializa} />
                <InfoRow label="Ingreso mensual ventas" value={areaProductiva.ingreso_mensual_ventas ? `$${Number(areaProductiva.ingreso_mensual_ventas).toLocaleString("es-CO")}` : null} />
              </div>
            </SectionCard>
          )}

          {/* Info Financiera */}
          {infoFinanciera && (
            <SectionCard title="Informacion Financiera" icon={DollarSign}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Ingresos agropecuaria" value={infoFinanciera.ingresos_mensuales_agropecuaria ? `$${Number(infoFinanciera.ingresos_mensuales_agropecuaria).toLocaleString("es-CO")}` : null} />
                <InfoRow label="Ingresos otros" value={infoFinanciera.ingresos_mensuales_otros ? `$${Number(infoFinanciera.ingresos_mensuales_otros).toLocaleString("es-CO")}` : null} />
                <InfoRow label="Egresos mensuales" value={infoFinanciera.egresos_mensuales ? `$${Number(infoFinanciera.egresos_mensuales).toLocaleString("es-CO")}` : null} />
                <InfoRow label="Activos totales" value={infoFinanciera.activos_totales ? `$${Number(infoFinanciera.activos_totales).toLocaleString("es-CO")}` : null} />
                <InfoRow label="Activos agropecuaria" value={infoFinanciera.activos_agropecuaria ? `$${Number(infoFinanciera.activos_agropecuaria).toLocaleString("es-CO")}` : null} />
                <InfoRow label="Pasivos totales" value={infoFinanciera.pasivos_totales ? `$${Number(infoFinanciera.pasivos_totales).toLocaleString("es-CO")}` : null} />
              </div>
            </SectionCard>
          )}
        </div>

        {/* Fotos y Firma */}
        {(photos.length > 0 || firma) && (
          <div className="mt-6">
            <SectionCard title="Fotos y Firma" icon={Camera}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo, idx) => (
                  <div key={idx} className="group relative">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{photo.label}</p>
                    <div
                      className="relative cursor-pointer overflow-hidden rounded-lg border border-border bg-muted"
                      onClick={() => setPhotoModal(photo.url)}
                    >
                      <img
                        src={photo.url}
                        alt={photo.label}
                        className="h-48 w-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none"
                          ;(e.target as HTMLImageElement).parentElement!.innerHTML =
                            '<div class="flex h-48 items-center justify-center"><p class="text-sm text-muted-foreground">Imagen no disponible</p></div>'
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                        <Eye className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </div>
                  </div>
                ))}
                {firma && (
                  <div className="group relative">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Firma del Productor</p>
                    <div
                      className="relative cursor-pointer overflow-hidden rounded-lg border border-border bg-white p-2"
                      onClick={() => setPhotoModal(firma)}
                    >
                      <img
                        src={firma}
                        alt="Firma del productor"
                        className="h-44 w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none"
                          ;(e.target as HTMLImageElement).parentElement!.innerHTML =
                            '<div class="flex h-44 items-center justify-center"><p class="text-sm text-muted-foreground">Firma no disponible</p></div>'
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                        <Eye className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {/* Autorizaciones */}
        <div className="mt-6 mb-8">
          <SectionCard title="Autorizaciones" icon={PenTool}>
            <div className="flex flex-wrap gap-3">
              <Badge
                variant="outline"
                className={
                  caracterizacion?.autorizacion_datos_personales
                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                    : "bg-red-500/10 text-red-600 border-red-500/20"
                }
              >
                {caracterizacion?.autorizacion_datos_personales ? "Autoriza" : "No autoriza"} tratamiento datos personales
              </Badge>
              <Badge
                variant="outline"
                className={
                  caracterizacion?.autorizacion_consulta_crediticia
                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                    : "bg-red-500/10 text-red-600 border-red-500/20"
                }
              >
                {caracterizacion?.autorizacion_consulta_crediticia ? "Autoriza" : "No autoriza"} consulta crediticia
              </Badge>
            </div>
            {caracterizacion?.observaciones && (
              <div className="mt-3">
                <InfoRow label="Observaciones" value={caracterizacion.observaciones} />
              </div>
            )}
          </SectionCard>
        </div>
      </main>

      {/* Photo Modal */}
      {photoModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPhotoModal(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={photoModal}
              alt="Vista ampliada"
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
            />
            <button
              onClick={() => setPhotoModal(null)}
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-gray-200"
            >
              X
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== LOCAL DETAIL VIEW ====================
function LocalDetailView({
  data,
  photoModal,
  setPhotoModal,
}: {
  data: CaracterizacionLocal
  photoModal: string | null
  setPhotoModal: (url: string | null) => void
}) {
  const router = useRouter()

  const nombre = data.nombreProductor || `${data.beneficiario?.primerNombre || ""} ${data.beneficiario?.primerApellido || ""}`.trim() || "Sin nombre"

  const lat = data.predio?.latitud
  const lng = data.predio?.longitud
  const hasCoords = lat !== null && lat !== undefined && lng !== null && lng !== undefined && !isNaN(lat) && !isNaN(lng)

  const estadoMap: Record<string, { label: string; color: string }> = {
    PENDIENTE_SINCRONIZACION: { label: "Pendiente", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
    SINCRONIZADO: { label: "Sincronizado", color: "bg-green-500/10 text-green-600 border-green-500/20" },
    ERROR_SINCRONIZACION: { label: "Error", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  }
  const est = estadoMap[data.estado] || estadoMap.PENDIENTE_SINCRONIZACION

  const photos = [
    { label: "Foto 1", url: data.archivos?.foto1Url },
    { label: "Foto 2", url: data.archivos?.foto2Url },
  ].filter((p) => p.url)

  const firma = data.archivos?.firmaProductorUrl || data.autorizacion?.firmaDigital

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Leaf className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold md:text-base">Detalle Caracterizacion</h1>
                <p className="text-xs text-muted-foreground font-mono">{data.radicadoLocal}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={est.color}>{est.label}</Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {data.estado === "PENDIENTE_SINCRONIZACION" && (
          <Card className="mb-6 border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Registro local - pendiente de sincronizacion</p>
                <p className="text-xs text-muted-foreground">
                  Las imagenes se guardaron localmente. Se subiran al servidor cuando sincronices.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumen */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <User className="h-8 w-8 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Productor</p>
                <p className="truncate text-sm font-semibold">{nombre}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <MapPin className="h-8 w-8 text-green-600" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Predio</p>
                <p className="truncate text-sm font-semibold">{data.predio?.nombrePredio || "Sin nombre"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Fecha visita</p>
                <p className="text-sm font-semibold">
                  {data.visita?.fechaVisita
                    ? new Date(data.visita.fechaVisita).toLocaleDateString("es-CO")
                    : "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <FileText className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Tecnico</p>
                <p className="text-sm font-semibold">{data.visita?.nombreTecnico || "N/A"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mapa */}
        {hasCoords && (
          <Card className="mb-6 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5 text-primary" />
                Ubicacion del Predio
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {lat!.toFixed(6)}, {lng!.toFixed(6)}
                  {data.predio?.altitudMsnm && ` | ${data.predio.altitudMsnm} msnm`}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px] md:h-[500px]">
                <MapViewer
                  initialCenter={[lat!, lng!]}
                  initialZoom={14}
                  markerPosition={[lat!, lng!]}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Beneficiario */}
          <SectionCard title="Datos del Beneficiario" icon={User}>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Primer nombre" value={data.beneficiario?.primerNombre} />
              <InfoRow label="Segundo nombre" value={data.beneficiario?.segundoNombre} />
              <InfoRow label="Primer apellido" value={data.beneficiario?.primerApellido} />
              <InfoRow label="Segundo apellido" value={data.beneficiario?.segundoApellido} />
              <InfoRow label="Tipo documento" value={data.beneficiario?.tipoDocumento} />
              <InfoRow label="No. documento" value={data.beneficiario?.numeroDocumento} />
              <InfoRow label="Edad" value={data.beneficiario?.edad} />
              <InfoRow label="Telefono" value={data.beneficiario?.telefono} />
              <InfoRow label="Email" value={data.beneficiario?.email} />
              <InfoRow label="Ocupacion principal" value={data.beneficiario?.ocupacionPrincipal} />
            </div>
          </SectionCard>

          {/* Predio */}
          <SectionCard title="Datos del Predio" icon={MapPin}>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Nombre predio" value={data.predio?.nombrePredio} />
              <InfoRow label="Departamento" value={data.predio?.departamento} />
              <InfoRow label="Municipio" value={data.predio?.municipio} />
              <InfoRow label="Vereda" value={data.predio?.vereda} />
              <InfoRow label="Direccion" value={data.predio?.direccion} />
              <InfoRow label="Tipo tenencia" value={data.predio?.tipoTenencia} />
              <InfoRow label="Documento tenencia" value={data.predio?.documentoTenencia} />
              <InfoRow label="Codigo catastral" value={data.predio?.codigoCatastral} />
              <InfoRow label="Area total (ha)" value={data.predio?.areaTotalHectareas} />
              <InfoRow label="Area productiva (ha)" value={data.predio?.areaProductivaHectareas} />
              <InfoRow label="Vive en predio" value={data.predio?.viveEnPredio} />
              <InfoRow label="Tiene vivienda" value={data.predio?.tieneVivienda ? "Si" : "No"} />
              <InfoRow label="Cultivos existentes" value={data.predio?.cultivosExistentes} />
            </div>
          </SectionCard>

          {/* Caracterizacion */}
          {data.caracterizacion && (
            <SectionCard title="Caracterizacion del Predio" icon={Mountain}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Topografia" value={data.caracterizacion.topografia} />
                <InfoRow label="Ruta acceso" value={data.caracterizacion.rutaAcceso} />
                <InfoRow label="Distancia (km)" value={data.caracterizacion.distanciaKm} />
                <InfoRow label="Tiempo acceso" value={data.caracterizacion.tiempoAcceso} />
                <InfoRow label="Temperatura (°C)" value={data.caracterizacion.temperaturaCelsius} />
                <InfoRow label="Meses lluvia" value={data.caracterizacion.mesesLluvia} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <BooleanTag label="Bosque" active={data.caracterizacion.coberturaBosque} />
                <BooleanTag label="Cultivos" active={data.caracterizacion.coberturaCultivos} />
                <BooleanTag label="Pastos" active={data.caracterizacion.coberturaPastos} />
                <BooleanTag label="Rastrojo" active={data.caracterizacion.coberturaRastrojo} />
              </div>
            </SectionCard>
          )}

          {/* Agua */}
          {data.aguaRiesgos && (
            <SectionCard title="Abastecimiento de Agua" icon={Droplets}>
              <div className="flex flex-wrap gap-2">
                <BooleanTag label="Nacimiento / Manantial" active={data.aguaRiesgos.nacimientoManantial} />
                <BooleanTag label="Rio / Quebrada" active={data.aguaRiesgos.rioQuebrada} />
                <BooleanTag label="Pozo" active={data.aguaRiesgos.pozo} />
                <BooleanTag label="Acueducto rural" active={data.aguaRiesgos.acueductoRural} />
                <BooleanTag label="Canal distrito riego" active={data.aguaRiesgos.canalDistritoRiego} />
                <BooleanTag label="Jagüey / Reservorio" active={data.aguaRiesgos.jagueyReservorio} />
                <BooleanTag label="Agua lluvia" active={data.aguaRiesgos.aguaLluvia} />
              </div>
              <InfoRow label="Otra fuente" value={data.aguaRiesgos.otraFuente} />
            </SectionCard>
          )}

          {/* Riesgos */}
          {data.aguaRiesgos && (
            <SectionCard title="Riesgos del Predio" icon={AlertTriangle}>
              <div className="flex flex-wrap gap-2">
                <BooleanTag label="Inundacion" active={data.aguaRiesgos.inundacion} />
                <BooleanTag label="Sequia" active={data.aguaRiesgos.sequia} />
                <BooleanTag label="Viento" active={data.aguaRiesgos.viento} />
                <BooleanTag label="Helada" active={data.aguaRiesgos.helada} />
              </div>
              <InfoRow label="Otros riesgos" value={data.aguaRiesgos.otrosRiesgos} />
            </SectionCard>
          )}

          {/* Area productiva */}
          {data.areaProductiva && (
            <SectionCard title="Area Productiva" icon={Sprout}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Sistema productivo" value={data.areaProductiva.sistemaProduccion} />
                <InfoRow label="Caracterizacion cultivo" value={data.areaProductiva.caracterizacionCultivo} />
                <InfoRow label="Cantidad produccion" value={data.areaProductiva.cantidadProduccion} />
                <InfoRow label="Estado cultivo" value={data.areaProductiva.estadoCultivo} />
                <InfoRow label="Infraestructura procesamiento" value={data.areaProductiva.tieneInfraestructuraProcesamiento ? "Si" : "No"} />
                <InfoRow label="Estructuras" value={data.areaProductiva.estructuras} />
                <InfoRow label="Interesado en programa" value={data.areaProductiva.interesadoPrograma ? "Si" : "No"} />
                <InfoRow label="Donde comercializa" value={data.areaProductiva.dondeComercializa} />
                <InfoRow label="Ingreso mensual ventas" value={data.areaProductiva.ingresoMensualVentas ? `$${data.areaProductiva.ingresoMensualVentas.toLocaleString("es-CO")}` : null} />
              </div>
            </SectionCard>
          )}

          {/* Info Financiera */}
          {data.infoFinanciera && (
            <SectionCard title="Informacion Financiera" icon={DollarSign}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Ingresos agropecuaria" value={data.infoFinanciera.ingresosMensualesAgropecuaria ? `$${data.infoFinanciera.ingresosMensualesAgropecuaria.toLocaleString("es-CO")}` : null} />
                <InfoRow label="Ingresos otros" value={data.infoFinanciera.ingresosMensualesOtros ? `$${data.infoFinanciera.ingresosMensualesOtros.toLocaleString("es-CO")}` : null} />
                <InfoRow label="Egresos mensuales" value={data.infoFinanciera.egresosMensuales ? `$${data.infoFinanciera.egresosMensuales.toLocaleString("es-CO")}` : null} />
                <InfoRow label="Activos totales" value={data.infoFinanciera.activosTotales ? `$${data.infoFinanciera.activosTotales.toLocaleString("es-CO")}` : null} />
                <InfoRow label="Activos agropecuaria" value={data.infoFinanciera.activosAgropecuaria ? `$${data.infoFinanciera.activosAgropecuaria.toLocaleString("es-CO")}` : null} />
                <InfoRow label="Pasivos totales" value={data.infoFinanciera.pasivosTotales ? `$${data.infoFinanciera.pasivosTotales.toLocaleString("es-CO")}` : null} />
              </div>
            </SectionCard>
          )}
        </div>

        {/* Fotos y Firma */}
        {(photos.length > 0 || firma) && (
          <div className="mt-6">
            <SectionCard title="Fotos y Firma" icon={Camera}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo, idx) => (
                  <div key={idx} className="group relative">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{photo.label}</p>
                    <div
                      className="relative cursor-pointer overflow-hidden rounded-lg border border-border bg-muted"
                      onClick={() => setPhotoModal(photo.url!)}
                    >
                      <img
                        src={photo.url}
                        alt={photo.label}
                        className="h-48 w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                        <Eye className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </div>
                  </div>
                ))}
                {firma && (
                  <div className="group relative">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Firma del Productor</p>
                    <div
                      className="relative cursor-pointer overflow-hidden rounded-lg border border-border bg-white p-2"
                      onClick={() => setPhotoModal(firma)}
                    >
                      <img
                        src={firma}
                        alt="Firma"
                        className="h-44 w-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {/* Autorizaciones */}
        <div className="mt-6 mb-8">
          <SectionCard title="Autorizaciones" icon={PenTool}>
            <div className="flex flex-wrap gap-3">
              <Badge
                variant="outline"
                className={
                  data.autorizacion?.autorizaTratamientoDatos
                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                    : "bg-red-500/10 text-red-600 border-red-500/20"
                }
              >
                {data.autorizacion?.autorizaTratamientoDatos ? "Autoriza" : "No autoriza"} tratamiento datos personales
              </Badge>
              <Badge
                variant="outline"
                className={
                  data.autorizacion?.autorizaConsultaCrediticia
                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                    : "bg-red-500/10 text-red-600 border-red-500/20"
                }
              >
                {data.autorizacion?.autorizaConsultaCrediticia ? "Autoriza" : "No autoriza"} consulta crediticia
              </Badge>
            </div>
            {data.observaciones && (
              <div className="mt-3">
                <InfoRow label="Observaciones" value={data.observaciones} />
              </div>
            )}
          </SectionCard>
        </div>
      </main>

      {/* Photo Modal */}
      {photoModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPhotoModal(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={photoModal}
              alt="Vista ampliada"
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
            />
            <button
              onClick={() => setPhotoModal(null)}
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-gray-200"
            >
              X
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
