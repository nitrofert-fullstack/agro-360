"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
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
  Download,
} from "lucide-react"
import { generateCaracterizacionPDF, pdfFromServerData } from "@/lib/generate-pdf"
import { staggerContainer, staggerItem, fadeUp } from "@/lib/animations"
import { AppLayout } from "@/components/app-layout"

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

const PredioInsights = dynamic(
  () => import("@/components/predio-insights").then((mod) => mod.PredioInsights),
  { ssr: false }
)

function parsePoligono(raw: any): [number, number][] | undefined {
  if (!raw) return undefined
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Array.isArray(parsed) && parsed.length >= 3) return parsed as [number, number][]
  } catch { }
  return undefined
}

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

function SectionCard({ title, icon: Icon, children, accent = 'border-l-primary' }: { title: string; icon: React.ElementType; children: React.ReactNode; accent?: string }) {
  return (
    <Card className={`border-l-4 ${accent} border-border/60 bg-card/80`} style={{boxShadow: 'var(--shadow-sm)'}}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

const estadoConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDIENTE_SINCRONIZACION: { label: "Pendiente", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
  INICIADO: { label: "Iniciado", color: "bg-slate-500/10 text-slate-600 border-slate-500/20", icon: Clock },
  REVISADO: { label: "En Revisión", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Eye },
  EN_ESTUDIO_CREDITO: { label: "En Estudio Crédito", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: Eye },
  APROBADO: { label: "Viable", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle },
  CANCELADO: { label: "No Viable", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
}

function getEstado(estado: string) {
  return estadoConfig[estado] || estadoConfig.PENDIENTE_SINCRONIZACION
}

export default function CaracterizacionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { loading: authLoading, isAuthenticated, profile } = useAuth()
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
        setIsLoading(false)
        return
      }
    } catch { /* fallthrough */ }

    setError("No se encontró la caracterización")
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
          <p className="text-sm text-muted-foreground">Cargando caracterización...</p>
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

  if (serverData) {
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

  return null
}

// ==================== STATUS CHANGE PANEL ====================
function StatusChangePanel({
  visitaId,
  currentEstado,
  beneficiarioEmail,
  beneficiarioNombre,
  beneficiarioTelefono,
  userRol,
  onReload,
}: {
  visitaId: string
  currentEstado: string
  beneficiarioEmail: string | null
  beneficiarioNombre: string
  beneficiarioTelefono: string | null
  userRol: string | undefined
  onReload: () => void
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [observaciones, setObservaciones] = useState("")
  const [showInvite, setShowInvite] = useState(false)
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [credenciales, setCredenciales] = useState<{ email: string; password: string } | null>(null)
  const [yaTieneCuenta, setYaTieneCuenta] = useState<boolean | null>(null)

  useEffect(() => {
    if (!beneficiarioEmail) return
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('id')
      .eq('email', beneficiarioEmail)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => setYaTieneCuenta(!!data))
  }, [beneficiarioEmail])

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
      `Correo: ${credenciales.email}\nContraseña: ${credenciales.password}`
    )
    toast.success("Credenciales copiadas al portapapeles")
  }

  let allowedStates: string[] = []
  if (userRol === "admin") {
    allowedStates = ["REVISADO", "EN_ESTUDIO_CREDITO", "APROBADO", "CANCELADO"]
  } else if (userRol === "asesor") {
    allowedStates = ["REVISADO"]
  } else if (userRol === "analista") {
    allowedStates = ["EN_ESTUDIO_CREDITO", "APROBADO", "CANCELADO"]
  }

  const estados = [
    { key: "INICIADO", label: "Iniciado", icon: Clock, hoverClass: "hover:bg-slate-600 hover:text-white" },
    { key: "REVISADO", label: "En Revisión", icon: Eye, hoverClass: "hover:bg-blue-600 hover:text-white" },
    { key: "EN_ESTUDIO_CREDITO", label: "Estudio Crédito", icon: Eye, hoverClass: "hover:bg-purple-600 hover:text-white" },
    { key: "APROBADO", label: "Viable", icon: CheckCircle, hoverClass: "hover:bg-green-600 hover:text-white" },
    { key: "CANCELADO", label: "No Viable", icon: XCircle, hoverClass: "hover:bg-red-600 hover:text-white" },
  ].filter(e => allowedStates.includes(e.key))

  return (
    <div className="space-y-4">
      {/* Status buttons */}
      <Card className="border-l-4 border-l-primary bg-primary/5 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            Gestionar Estado
          </CardTitle>
          <CardDescription>Cambia el estado de esta caracterización</CardDescription>
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
        <Card className="border-l-4 border-l-green-500 bg-green-500/5 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-green-700 dark:text-green-400">
              <Mail className="h-5 w-5" />
              Credenciales del Beneficiario
            </CardTitle>
            <CardDescription>
              {beneficiarioEmail
                ? `Correo registrado: ${beneficiarioEmail}`
                : "El beneficiario no tiene correo registrado"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {yaTieneCuenta ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Este beneficiario ya tiene una cuenta de acceso registrada en el sistema.</span>
              </div>
            ) : !credenciales ? (
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
                    <p><span className="text-muted-foreground">Contraseña:</span> {credenciales.password}</p>
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

// ==================== DOWNLOAD HELPER ====================
async function downloadImage(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    // Fallback: abrir en pestaña nueva
    window.open(url, '_blank')
  }
}

function slugify(label: string) {
  return label.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')
}

// ==================== PHOTO MODAL ====================
function PhotoModal({ url, label, onClose }: { url: string; label?: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label ? `Imagen: ${label}` : 'Visualizar imagen'}
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={e => e.stopPropagation()}>
        <img src={url} alt={label || 'Imagen ampliada'} className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain" />
        <div className="absolute -top-2 right-6 flex gap-2">
          <button
            type="button"
            onClick={() => downloadImage(url, `${slugify(label || 'imagen')}.jpg`)}
            aria-label="Descargar imagen"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/80"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar imagen (Escape)"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-gray-200"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}


// ==================== MAP CARD ====================
const MAP_LAYERS = [
  { key: "ndvi" as const,        label: "NDVI",      color: "text-green-600",  bg: "bg-green-500/10",  border: "border-green-500/30" },
  { key: "satellite" as const,   label: "Satélite",  color: "text-blue-600",   bg: "bg-blue-500/10",   border: "border-blue-500/30" },
  { key: "temperature" as const, label: "Temperatura", color: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  { key: "precipitation" as const, label: "Lluvia",  color: "text-cyan-600",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30" },
]

function MapCard({ lat, lng, predio }: { lat: number; lng: number; predio: any }) {
  const [activeLayer, setActiveLayer] = useState<"ndvi" | "satellite" | "temperature" | "precipitation">("ndvi")

  const polyCoords = (() => {
    if (!predio?.poligono) return undefined
    try {
      const p = typeof predio.poligono === 'string' ? JSON.parse(predio.poligono) : predio.poligono
      return Array.isArray(p) && p.length >= 3 ? p : undefined
    } catch { return undefined }
  })()

  return (
    <Card className="border-l-4 border-l-green-500 bg-card/80 border-border/60 overflow-hidden flex flex-col" style={{boxShadow:'var(--shadow-md)'}}>
      {/* Header */}
      <CardHeader className="pb-2 pt-3 px-4 shrink-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-green-600" />
            Ubicación del Predio
          </CardTitle>
          <span className="text-xs text-muted-foreground font-mono hidden sm:block">
            {lat.toFixed(5)}, {lng.toFixed(5)}
            {predio?.altitud_msnm && ` · ${predio.altitud_msnm} msnm`}
          </span>
        </div>
      </CardHeader>

      {/* Selector de capas — integrado en la card */}
      <div className="shrink-0 px-4 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {MAP_LAYERS.map(({ key, label, color, bg, border }) => (
            <button
              key={key}
              onClick={() => setActiveLayer(key)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-150 ${
                activeLayer === key
                  ? `${bg} ${border} ${color}`
                  : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {label}
              {activeLayer === key && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </button>
          ))}
        </div>
      </div>

      {/* Mapa limpio */}
      <CardContent className="p-0 flex-1 min-h-0">
        <div className="h-[320px] md:h-[400px] lg:h-[440px]">
          <MapViewer
            initialCenter={[lat, lng]}
            initialZoom={14}
            markerPosition={[lat, lng]}
            polygonCoords={polyCoords}
            minimal={true}
            controlledLayer={activeLayer}
          />
        </div>
      </CardContent>

      {/* Footer con datos del predio */}
      {(predio?.municipio || predio?.vereda || predio?.area_total_hectareas) && (
        <div className="shrink-0 border-t border-border/40 px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 bg-muted/20">
          {predio?.municipio && (
            <span className="text-xs">
              <span className="font-medium text-foreground">{predio.municipio}</span>
              {predio?.departamento && <span className="text-muted-foreground">, {predio.departamento}</span>}
            </span>
          )}
          {predio?.vereda && <span className="text-xs text-muted-foreground">Vereda: <span className="font-medium text-foreground">{predio.vereda}</span></span>}
          {predio?.area_total_hectareas && <span className="text-xs text-muted-foreground">Área: <span className="font-medium text-foreground">{predio.area_total_hectareas} ha</span></span>}
          {predio?.altitud_msnm && <span className="text-xs text-muted-foreground">Alt: <span className="font-medium text-foreground">{predio.altitud_msnm} msnm</span></span>}
        </div>
      )}
    </Card>
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
    ? `${beneficiario.nombres || ''} ${beneficiario.apellidos || ''}`.trim() || "Sin nombre"
    : "Sin nombre"

  const lat = predio?.latitud ? parseFloat(predio.latitud) : null
  const lng = predio?.longitud ? parseFloat(predio.longitud) : null
  const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)

  const photos = [
    { label: "Foto del Beneficiario", url: caracterizacion?.foto_beneficiario_url },
    { label: "Foto 1 del Predio", url: caracterizacion?.foto_1_url },
    { label: "Foto 2 del Predio", url: caracterizacion?.foto_2_url },
    { label: "Documento (Frontal)", url: caracterizacion?.foto_doc_frontal_url },
    { label: "Documento (Reverso)", url: caracterizacion?.foto_doc_trasera_url },
  ].filter((p) => p.url)

  const firma = caracterizacion?.firma_productor_url
  const est = getEstado(caracterizacion?.estado || "INICIADO")
  const EstIcon = est.icon
  const canManageStatus = profile?.rol === "admin" || profile?.rol === "asesor" || profile?.rol === "analista"

  return (
    <AppLayout>
      {/* Barra de acciones de la página */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label="Volver al dashboard" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold leading-tight sm:text-lg">Detalle Caracterización</h1>
            <p className="truncate text-xs font-mono text-muted-foreground">
              {visita?.radicado_oficial || visita?.radicado_local}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="outline" className={`${est.color} gap-1 hidden sm:flex`}>
            <EstIcon className="h-3 w-3" />
            {est.label}
          </Badge>
          {((profile?.rol === "agricultor" && !["CANCELADO", "RECHAZADO"].includes(caracterizacion?.estado)) || ["admin", "asesor"].includes(profile?.rol)) && (
            <Button variant="outline" size="icon" className="h-10 w-10" aria-label="Editar" onClick={() => router.push(`/formulario/editar/${visita?.id}`)}>
              <PenTool className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="icon" className="h-10 w-10" aria-label="Descargar PDF" onClick={() => generateCaracterizacionPDF(pdfFromServerData(data))}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto -m-4 md:-m-6 p-4 md:p-6"
      >
        {/* Summary cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <motion.div variants={staggerItem}>
            <Card className="border-l-4 border-l-primary bg-primary/5 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
              <CardContent className="flex items-center gap-3 p-4">
                <User className="h-7 w-7 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Productor</p>
                  <p className="truncate text-sm font-semibold">{nombre}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Card className="border-l-4 border-l-green-500 bg-green-500/5 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
              <CardContent className="flex items-center gap-3 p-4">
                <MapPin className="h-7 w-7 shrink-0 text-green-600" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Predio</p>
                  <p className="truncate text-sm font-semibold">{predio?.nombre_predio || "Sin nombre"}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Card className="border-l-4 border-l-blue-500 bg-blue-500/5 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
              <CardContent className="flex items-center gap-3 p-4">
                <Calendar className="h-7 w-7 shrink-0 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Fecha visita</p>
                  <p className="text-sm font-semibold">
                    {(() => {
                      if (!visita?.fecha_visita) return 'N/A'
                      const m = String(visita.fecha_visita).match(/(\d{4}-\d{2}-\d{2})/)
                      if (!m) return 'N/A'
                      const d = new Date(m[1] + 'T12:00:00')
                      return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('es-CO')
                    })()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Card className="border-l-4 border-l-orange-500 bg-orange-500/5 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
              <CardContent className="flex items-center gap-3 p-4">
                <FileText className="h-7 w-7 shrink-0 text-orange-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Técnico</p>
                  <p className="text-sm font-semibold">{visita?.nombre_tecnico || "N/A"}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Mapa + Panel lateral */}
        {(hasCoords || canManageStatus) && (
          <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_360px]">
            {/* Mapa */}
            {hasCoords && (
              <MapCard lat={lat!} lng={lng!} predio={predio} />
            )}

            {/* Panel lateral: Insights + Gestión estado */}
            {(hasCoords || canManageStatus) && (
              <Card className="border-l-4 border-l-primary bg-card/80 border-border/60 flex flex-col" style={{boxShadow:'var(--shadow-md)'}}>
                <CardHeader className="pb-2 pt-4 px-4 shrink-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Análisis y Gestión
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {hasCoords && (
                    <PredioInsights
                      lat={lat!}
                      lng={lng!}
                      areaTotalHa={predio?.area_total_hectareas}
                      areaProductivaHa={predio?.area_productiva_hectareas}
                    />
                  )}
                  {canManageStatus && (
                    <StatusChangePanel
                      visitaId={visita?.id}
                      currentEstado={caracterizacion?.estado || "INICIADO"}
                      beneficiarioEmail={beneficiario?.correo || null}
                      beneficiarioNombre={nombre}
                      beneficiarioTelefono={beneficiario?.telefono || null}
                      userRol={profile?.rol}
                      onReload={onReload}
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Beneficiario */}
          <SectionCard title="Datos del Beneficiario" icon={User} accent="border-l-primary">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Nombre completo" value={nombre} />
              <InfoRow label="Tipo documento" value={beneficiario?.tipo_documento} />
              <InfoRow label="No. documento" value={beneficiario?.numero_documento} />
              <InfoRow label="Edad" value={beneficiario?.edad} />
              <InfoRow label="Genero" value={beneficiario?.genero} />
              <InfoRow label="Personas a cargo" value={beneficiario?.personas_a_cargo} />
              <InfoRow label="Telefono" value={beneficiario?.telefono} />
              <InfoRow label="Correo" value={beneficiario?.correo} />
              <InfoRow label="Ocupacion principal" value={beneficiario?.ocupacion_principal} />
            </div>
            {(beneficiario?.nombre_contacto_secundario || beneficiario?.telefono_secundario) && (
              <div className="mt-4 rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contacto Secundario</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <InfoRow label="Nombre" value={beneficiario?.nombre_contacto_secundario} />
                  <InfoRow label="Telefono" value={beneficiario?.telefono_secundario} />
                  <InfoRow label="Parentesco" value={beneficiario?.parentesco_contacto_secundario} />
                </div>
              </div>
            )}
          </SectionCard>

          {/* Predio */}
          <SectionCard title="Datos del Predio" icon={MapPin} accent="border-l-green-500">
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
            <SectionCard title="Caracterizacion del Predio" icon={Mountain} accent="border-l-blue-500">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Topografía" value={caracterizacionPredio.topografia} />
                <InfoRow label="Ruta de acceso" value={caracterizacionPredio.ruta_acceso} />
                <InfoRow label="Distancia (km)" value={caracterizacionPredio.distancia_km} />
                <InfoRow label="Tiempo de acceso" value={caracterizacionPredio.tiempo_acceso} />
                <InfoRow label="Temperatura (°C)" value={caracterizacionPredio.temperatura_celsius} />
                <InfoRow label="Meses de lluvia" value={caracterizacionPredio.meses_lluvia} />
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
            <SectionCard title="Abastecimiento de Agua" icon={Droplets} accent="border-l-cyan-500">
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
            <SectionCard title="Riesgos del Predio" icon={AlertTriangle} accent="border-l-red-500">
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
            <SectionCard title="Area Productiva" icon={Sprout} accent="border-l-emerald-500">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Sistema productivo" value={areaProductiva.sistema_productivo} />
                <InfoRow label="Caracterización del cultivo" value={areaProductiva.caracterizacion_cultivo} />
                <InfoRow label="Cantidad produccion" value={areaProductiva.cantidad_produccion} />
                <InfoRow label="Estado cultivo" value={areaProductiva.estado_cultivo} />
                <InfoRow label="Infraestructura procesamiento" value={areaProductiva.tiene_infraestructura_procesamiento ? "Si" : "No"} />
                <InfoRow label="Estructuras" value={areaProductiva.estructuras} />
                <InfoRow label="Donde comercializa" value={areaProductiva.donde_comercializa} />
                <InfoRow label="Ingreso mensual ventas" value={areaProductiva.ingreso_mensual_ventas ? `$${Number(areaProductiva.ingreso_mensual_ventas).toLocaleString("es-CO")}` : null} />
              </div>
            </SectionCard>
          )}

          {/* Info Financiera */}
          {infoFinanciera && (
            <SectionCard title="Informacion Financiera" icon={DollarSign} accent="border-l-yellow-500">
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
            <SectionCard title="Fotos y Firma" icon={Camera} accent="border-l-purple-500">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo, idx) => (
                  <div key={idx} className="group relative">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">{photo.label}</p>
                      <button
                        onClick={() => downloadImage(photo.url, `${slugify(photo.label)}.jpg`)}
                        title="Descargar imagen"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-white transition-colors"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                    </div>
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
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Firma del Productor</p>
                      <button
                        onClick={() => downloadImage(firma, 'firma-productor.png')}
                        title="Descargar firma"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-white transition-colors"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                    </div>
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
          <SectionCard title="Autorizaciones" icon={PenTool} accent="border-l-orange-500">
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className={caracterizacion?.autorizacion_datos_personales ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
                {caracterizacion?.autorizacion_datos_personales ? "Autoriza" : "No autoriza"} tratamiento datos personales
              </Badge>
              <Badge variant="outline" className={(caracterizacion as any)?.autorizacion_aviso_privacidad ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
                {(caracterizacion as any)?.autorizacion_aviso_privacidad ? "Leyó" : "No leyó"} aviso de privacidad
              </Badge>
              <Badge variant="outline" className={areaProductiva?.interesado_programa ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
                {areaProductiva?.interesado_programa ? "Requiere financiación" : "No requiere financiación"}
              </Badge>
            </div>
            {caracterizacion?.observaciones && (
              <div className="mt-3">
                <InfoRow label="Observaciones" value={caracterizacion.observaciones} />
              </div>
            )}
          </SectionCard>
        </div>
      </motion.div>

      {photoModal && <PhotoModal url={photoModal} label="imagen" onClose={() => setPhotoModal(null)} />}
    </AppLayout>
  )
}
