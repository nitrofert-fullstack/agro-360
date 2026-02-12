"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
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
  XCircle,
  Loader2,
  Mountain,
  Eye,
  Send,
  Copy,
  Shield,
  Mail,
} from "lucide-react"

const MapViewer = dynamic(
  () => import("@/components/map-viewer").then((mod) => mod.MapViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] md:h-[600px] items-center justify-center bg-muted">
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

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
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

const estadoConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDIENTE_SINCRONIZACION: { label: "Pendiente", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
  SINCRONIZADO: { label: "Sincronizado", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Eye },
  EN_REVISION: { label: "En Revision", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: Eye },
  APROBADO: { label: "Aprobado", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle },
  RECHAZADO: { label: "Rechazado", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
}

function getEstado(estado: string) {
  return estadoConfig[estado] || estadoConfig.PENDIENTE_SINCRONIZACION
}

export default function CaracterizacionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { loading: authLoading, isAuthenticated, profile } = useAuth()
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [localData, setLocalData] = useState<CaracterizacionLocal | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<"server" | "local" | null>(null)
  const [photoModal, setPhotoModal] = useState<string | null>(null)

  const id = params.id as string

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/caracterizacion/${encodeURIComponent(id)}`)
      if (res.ok) {
        const data = await res.json()
        setServerData(data)
        setSource("server")
        setIsLoading(false)
        return
      }
    } catch { /* try local */ }

    try {
      const local = await getCaracterizacionByRadicado(id)
      if (local) {
        setLocalData(local)
        setSource("local")
        setIsLoading(false)
        return
      }
    } catch { /* ignore */ }

    setError("No se encontro la caracterizacion")
    setIsLoading(false)
  }, [id])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) { router.push("/auth/login"); return }
    loadData()
  }, [id, authLoading, isAuthenticated, loadData])

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

  if (source === "server" && serverData) {
    return (
      <ServerDetailView
        data={serverData}
        photoModal={photoModal}
        setPhotoModal={setPhotoModal}
        profile={profile}
        onReload={loadData}
      />
    )
  }

  if (source === "local" && localData) {
    return <LocalDetailView data={localData} photoModal={photoModal} setPhotoModal={setPhotoModal} />
  }

  return null
}

// ==================== STATUS CHANGE PANEL ====================
function StatusChangePanel({
  visitaId,
  currentEstado,
  beneficiarioEmail,
  beneficiarioNombre,
  beneficiarioTelefono,
  onReload,
}: {
  visitaId: string
  currentEstado: string
  beneficiarioEmail: string | null
  beneficiarioNombre: string
  beneficiarioTelefono: string | null
  onReload: () => void
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [observaciones, setObservaciones] = useState("")
  const [showInvite, setShowInvite] = useState(false)
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [credenciales, setCredenciales] = useState<{ email: string; password: string } | null>(null)

  const handleUpdateEstado = async (nuevoEstado: string) => {
    setIsUpdating(true)
    try {
      const res = await fetch("/api/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitaId,
          estado: nuevoEstado,
          observaciones: observaciones || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(`Estado actualizado a "${getEstado(nuevoEstado).label}"`)

      if (nuevoEstado === "APROBADO" && beneficiarioEmail) {
        setShowInvite(true)
      }

      onReload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar estado")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSendInvite = async () => {
    if (!beneficiarioEmail) {
      toast.error("El beneficiario no tiene correo registrado")
      return
    }

    setIsSendingInvite(true)
    try {
      const res = await fetch("/api/invitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: beneficiarioEmail,
          nombreCompleto: beneficiarioNombre,
          telefono: beneficiarioTelefono,
          visitaId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.credenciales) {
        setCredenciales(data.credenciales)
        toast.success("Cuenta creada exitosamente")
      } else {
        toast.success("Invitacion creada")
      }

      onReload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar invitacion")
    } finally {
      setIsSendingInvite(false)
    }
  }

  const copyCredentials = () => {
    if (!credenciales) return
    navigator.clipboard.writeText(
      `Correo: ${credenciales.email}\nContrasena: ${credenciales.password}`
    )
    toast.success("Credenciales copiadas al portapapeles")
  }

  const estados = [
    { key: "SINCRONIZADO", label: "Sincronizado", icon: Eye, hoverClass: "hover:bg-blue-600 hover:text-white" },
    { key: "EN_REVISION", label: "En Revision", icon: Eye, hoverClass: "hover:bg-purple-600 hover:text-white" },
    { key: "APROBADO", label: "Aprobar", icon: CheckCircle, hoverClass: "hover:bg-green-600 hover:text-white" },
    { key: "RECHAZADO", label: "Rechazar", icon: XCircle, hoverClass: "hover:bg-red-600 hover:text-white" },
  ]

  return (
    <div className="space-y-4">
      {/* Status buttons */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            Gestionar Estado
          </CardTitle>
          <CardDescription>Cambia el estado de esta caracterizacion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {estados.map(({ key, label, icon: Icon, hoverClass }) => {
              const isCurrent = currentEstado === key
              return (
                <Button
                  key={key}
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleUpdateEstado(key)}
                  disabled={isUpdating || isCurrent}
                  className={`gap-2 ${!isCurrent ? hoverClass : ""}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              )
            })}
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Observaciones (opcional)..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invitation section */}
      {(currentEstado === "APROBADO" || showInvite) && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-green-700 dark:text-green-400">
              <Mail className="h-5 w-5" />
              Enviar Credenciales al Beneficiario
            </CardTitle>
            <CardDescription>
              {beneficiarioEmail
                ? `Se enviaran las credenciales a: ${beneficiarioEmail}`
                : "El beneficiario no tiene correo registrado"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!credenciales ? (
              <Button
                onClick={handleSendInvite}
                disabled={isSendingInvite || !beneficiarioEmail}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {isSendingInvite ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isSendingInvite ? "Creando cuenta..." : "Crear cuenta y enviar credenciales"}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-green-500/30 bg-white p-4 dark:bg-green-950/30">
                  <p className="mb-2 text-sm font-medium text-green-700 dark:text-green-300">
                    Credenciales del beneficiario:
                  </p>
                  <div className="space-y-1 font-mono text-sm">
                    <p><span className="text-muted-foreground">Correo:</span> {credenciales.email}</p>
                    <p><span className="text-muted-foreground">Contrasena:</span> {credenciales.password}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={copyCredentials} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copiar credenciales
                </Button>
                <p className="text-xs text-muted-foreground">
                  Comparta estas credenciales con el beneficiario. Podra acceder al sistema y ver sus terrenos registrados.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ==================== PHOTO MODAL ====================
function PhotoModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] max-w-[90vw]">
        <img src={url} alt="Vista ampliada" className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain" />
        <button
          onClick={onClose}
          className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-gray-200"
        >
          X
        </button>
      </div>
    </div>
  )
}

// ==================== SERVER DETAIL VIEW ====================
function ServerDetailView({
  data,
  photoModal,
  setPhotoModal,
  profile,
  onReload,
}: {
  data: ServerData
  photoModal: string | null
  setPhotoModal: (url: string | null) => void
  profile: any
  onReload: () => void
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
  const est = getEstado(visita?.estado || "SINCRONIZADO")
  const EstIcon = est.icon
  const canManageStatus = profile?.rol === "admin" || profile?.rol === "asesor"

  return (
    <div className="min-h-screen bg-background pb-12">
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
            <Badge variant="outline" className={est.color}>
              <EstIcon className="mr-1 h-3 w-3" />
              {est.label}
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* Summary cards */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <User className="h-8 w-8 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Productor</p>
                <p className="truncate text-sm font-semibold">{nombre}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <MapPin className="h-8 w-8 shrink-0 text-green-600" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Predio</p>
                <p className="truncate text-sm font-semibold">{predio?.nombre_predio || "Sin nombre"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Calendar className="h-8 w-8 shrink-0 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Fecha visita</p>
                <p className="text-sm font-semibold">
                  {visita?.fecha_visita ? new Date(visita.fecha_visita).toLocaleDateString("es-CO") : "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <FileText className="h-8 w-8 shrink-0 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Tecnico</p>
                <p className="text-sm font-semibold">{visita?.nombre_tecnico || "N/A"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map - full width, bigger */}
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
            <CardContent className="p-0 pb-0">
              <div className="h-[500px] md:h-[600px]">
                <MapViewer
                  initialCenter={[lat!, lng!]}
                  initialZoom={14}
                  markerPosition={[lat!, lng!]}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Management - for asesor/admin */}
        {canManageStatus && (
          <div className="mb-6">
            <StatusChangePanel
              visitaId={visita?.id}
              currentEstado={visita?.estado || "SINCRONIZADO"}
              beneficiarioEmail={beneficiario?.correo || null}
              beneficiarioNombre={nombre}
              beneficiarioTelefono={beneficiario?.telefono || null}
              onReload={onReload}
            />
          </div>
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
                <InfoRow label="Temperatura (C)" value={caracterizacionPredio.temperatura_celsius} />
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
              {abastecimientoAgua.otra_fuente && (
                <div className="mt-3">
                  <InfoRow label="Otra fuente" value={abastecimientoAgua.otra_fuente} />
                </div>
              )}
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
                      <img src={photo.url} alt={photo.label} className="h-48 w-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
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
                    <div className="relative cursor-pointer overflow-hidden rounded-lg border border-border bg-white p-2" onClick={() => setPhotoModal(firma)}>
                      <img src={firma} alt="Firma" className="h-44 w-full object-contain" />
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {/* Autorizaciones */}
        <div className="mt-6">
          <SectionCard title="Autorizaciones" icon={PenTool}>
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className={caracterizacion?.autorizacion_datos_personales ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
                {caracterizacion?.autorizacion_datos_personales ? "Autoriza" : "No autoriza"} tratamiento datos personales
              </Badge>
              <Badge variant="outline" className={caracterizacion?.autorizacion_consulta_crediticia ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
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

      {photoModal && <PhotoModal url={photoModal} onClose={() => setPhotoModal(null)} />}
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
  const est = getEstado(data.estado)
  const EstIcon = est.icon

  const photos = [
    { label: "Foto 1", url: data.archivos?.foto1Url },
    { label: "Foto 2", url: data.archivos?.foto2Url },
  ].filter((p) => p.url)
  const firma = data.archivos?.firmaProductorUrl || data.autorizacion?.firmaDigital

  return (
    <div className="min-h-screen bg-background pb-12">
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
            <Badge variant="outline" className={est.color}>
              <EstIcon className="mr-1 h-3 w-3" />
              {est.label}
            </Badge>
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
                <p className="text-xs text-muted-foreground">Las imagenes se guardaron localmente. Se subiran al servidor cuando sincronices.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <User className="h-8 w-8 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Productor</p>
                <p className="truncate text-sm font-semibold">{nombre}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <MapPin className="h-8 w-8 shrink-0 text-green-600" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Predio</p>
                <p className="truncate text-sm font-semibold">{data.predio?.nombrePredio || "Sin nombre"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Calendar className="h-8 w-8 shrink-0 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Fecha visita</p>
                <p className="text-sm font-semibold">{data.visita?.fechaVisita ? new Date(data.visita.fechaVisita).toLocaleDateString("es-CO") : "N/A"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <FileText className="h-8 w-8 shrink-0 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Tecnico</p>
                <p className="text-sm font-semibold">{data.visita?.nombreTecnico || "N/A"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
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
            <CardContent className="p-0 pb-0">
              <div className="h-[500px] md:h-[600px]">
                <MapViewer initialCenter={[lat!, lng!]} initialZoom={14} markerPosition={[lat!, lng!]} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
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

          <SectionCard title="Datos del Predio" icon={MapPin}>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Nombre predio" value={data.predio?.nombrePredio} />
              <InfoRow label="Departamento" value={data.predio?.departamento} />
              <InfoRow label="Municipio" value={data.predio?.municipio} />
              <InfoRow label="Vereda" value={data.predio?.vereda} />
              <InfoRow label="Direccion" value={data.predio?.direccion} />
              <InfoRow label="Tipo tenencia" value={data.predio?.tipoTenencia} />
              <InfoRow label="Area total (ha)" value={data.predio?.areaTotalHectareas} />
              <InfoRow label="Area productiva (ha)" value={data.predio?.areaProductivaHectareas} />
              <InfoRow label="Cultivos existentes" value={data.predio?.cultivosExistentes} />
            </div>
          </SectionCard>

          {data.caracterizacion && (
            <SectionCard title="Caracterizacion del Predio" icon={Mountain}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Topografia" value={data.caracterizacion.topografia} />
                <InfoRow label="Ruta acceso" value={data.caracterizacion.rutaAcceso} />
                <InfoRow label="Distancia (km)" value={data.caracterizacion.distanciaKm} />
                <InfoRow label="Tiempo acceso" value={data.caracterizacion.tiempoAcceso} />
                <InfoRow label="Temperatura (C)" value={data.caracterizacion.temperaturaCelsius} />
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
            </SectionCard>
          )}

          {data.aguaRiesgos && (
            <SectionCard title="Riesgos del Predio" icon={AlertTriangle}>
              <div className="flex flex-wrap gap-2">
                <BooleanTag label="Inundacion" active={data.aguaRiesgos.inundacion} />
                <BooleanTag label="Sequia" active={data.aguaRiesgos.sequia} />
                <BooleanTag label="Viento" active={data.aguaRiesgos.viento} />
                <BooleanTag label="Helada" active={data.aguaRiesgos.helada} />
              </div>
            </SectionCard>
          )}

          {data.areaProductiva && (
            <SectionCard title="Area Productiva" icon={Sprout}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Sistema productivo" value={data.areaProductiva.sistemaProduccion} />
                <InfoRow label="Caracterizacion cultivo" value={data.areaProductiva.caracterizacionCultivo} />
                <InfoRow label="Estado cultivo" value={data.areaProductiva.estadoCultivo} />
                <InfoRow label="Donde comercializa" value={data.areaProductiva.dondeComercializa} />
              </div>
            </SectionCard>
          )}

          {data.infoFinanciera && (
            <SectionCard title="Informacion Financiera" icon={DollarSign}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Ingresos agropecuaria" value={data.infoFinanciera.ingresosMensualesAgropecuaria ? `$${data.infoFinanciera.ingresosMensualesAgropecuaria.toLocaleString("es-CO")}` : null} />
                <InfoRow label="Egresos mensuales" value={data.infoFinanciera.egresosMensuales ? `$${data.infoFinanciera.egresosMensuales.toLocaleString("es-CO")}` : null} />
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
                    <div className="relative cursor-pointer overflow-hidden rounded-lg border border-border bg-muted" onClick={() => setPhotoModal(photo.url!)}>
                      <img src={photo.url} alt={photo.label} className="h-48 w-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                        <Eye className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </div>
                  </div>
                ))}
                {firma && (
                  <div className="group relative">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Firma del Productor</p>
                    <div className="rounded-lg border border-border bg-white p-2 cursor-pointer" onClick={() => setPhotoModal(firma)}>
                      <img src={firma} alt="Firma" className="h-44 w-full object-contain" />
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {/* Autorizaciones */}
        <div className="mt-6">
          <SectionCard title="Autorizaciones" icon={PenTool}>
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className={data.autorizacion?.autorizaTratamientoDatos ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
                {data.autorizacion?.autorizaTratamientoDatos ? "Autoriza" : "No autoriza"} tratamiento datos personales
              </Badge>
              <Badge variant="outline" className={data.autorizacion?.autorizaConsultaCrediticia ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
                {data.autorizacion?.autorizaConsultaCrediticia ? "Autoriza" : "No autoriza"} consulta crediticia
              </Badge>
            </div>
          </SectionCard>
        </div>
      </main>

      {photoModal && <PhotoModal url={photoModal} onClose={() => setPhotoModal(null)} />}
    </div>
  )
}
