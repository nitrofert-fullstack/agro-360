"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  ChevronLeft,
  RefreshCw,
  LogOut,
  Loader2,
  UserX,
  UserCheck,
  Trash2,
  Mail,
  Shield,
  Download,
  Printer,
  PenTool,
  BarChart2,
  TrendingUp,
  Activity,
  X,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ThemeToggle } from "./theme-toggle"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { staggerContainer, staggerItem, fadeUp } from "@/lib/animations"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts"

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

import type { MapMarker } from "./map-viewer"

// Type from Supabase join query
interface CaracterizacionDB {
  id: string
  radicado_local: string
  radicado_oficial: string | null
  estado: string
  observaciones: string | null
  created_at: string
  updated_at: string
  firma_productor_url: string | null
  foto_beneficiario_url: string | null
  foto_1_url: string | null
  foto_2_url: string | null
  foto_doc_frontal_url: string | null
  foto_doc_trasera_url: string | null
  autorizacion_datos_personales: boolean | null
  autorizacion_consulta_crediticia: boolean | null
  autorizacion_aviso_privacidad: boolean | null
  autorizacion_uso_imagen: boolean | null
  // Joined relations
  beneficiario: {
    id: string
    nombres: string
    apellidos: string
    tipo_documento: string
    numero_documento: string
    telefono: string | null
    correo: string | null
    edad: number | null
    genero: string | null
    personas_a_cargo: number | null
    ocupacion_principal: string | null
  } | null
  predio: {
    id: string
    nombre_predio: string
    direccion: string | null
    tipo_tenencia: string | null
    area_total_hectareas: number | null
    area_productiva_hectareas: number | null
    latitud: number | null
    longitud: number | null
    altitud_msnm: number | null
    departamento: string | null
    municipio: string | null
    vereda: string | null
    codigo_catastral: string | null
    vive_en_predio: string | null
    tiene_vivienda: boolean | null
    cultivos_existentes: string | null
    poligono: [number, number][] | null
  } | null
  visita: {
    id: string
    fecha_visita: string | null
    nombre_tecnico: string | null
    radicado_local: string | null
    radicado_oficial: string | null
    asesor_id: string | null
  } | null
  caracterizacion_predio: {
    id: string
    topografia: string | null
    cobertura_bosque: boolean | null
    cobertura_cultivos: boolean | null
    cobertura_pastos: boolean | null
    cobertura_rastrojo: boolean | null
    ruta_acceso: string | null
    distancia_km: number | null
    tiempo_acceso: string | null
    temperatura_celsius: number | null
    meses_lluvia: string | null
  } | null
  area_productiva: {
    id: string
    sistema_productivo: string | null
    caracterizacion_cultivo: string | null
    cantidad_produccion: string | null
    estado_cultivo: string | null
    tiene_infraestructura_procesamiento: boolean | null
    estructuras: string | null
    interesado_programa: boolean | null
    donde_comercializa: string | null
    ingreso_mensual_ventas: number | null
  } | null
  informacion_financiera: {
    id: string
    ingresos_mensuales_agropecuaria: number | null
    ingresos_mensuales_otros: number | null
    egresos_mensuales: number | null
    activos_totales: number | null
    activos_agropecuaria: number | null
    pasivos_totales: number | null
  } | null
  asesor: {
    id: string
    nombre_completo: string | null
    email: string | null
  } | null
}

// ── Componente selector de asesor ──────────────────────────────────────────
function AsesorSelector({ visitaId, currentAsesorNombre, onChanged }: {
  visitaId?: string
  currentAsesorNombre?: string | null
  onChanged: () => void
}) {
  const [asesores, setAsesores] = React.useState<{ id: string; nombre_completo: string | null }[]>([])
  const [selected, setSelected] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setIsLoading(true)
    fetch('/api/admin/users?asesores_only=true')
      .then(r => r.json())
      .then(d => { if (d.asesores) setAsesores(d.asesores) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handleChange = async () => {
    if (!selected || !visitaId) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/cambiar-asesor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitaId, asesorId: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onChanged()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        disabled={isLoading}
        className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">Cambiar asesor...</option>
        {asesores.map(a => (
          <option key={a.id} value={a.id}>{a.nombre_completo || a.id}</option>
        ))}
      </select>
      <button
        onClick={handleChange}
        disabled={!selected || isSaving}
        className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
      >
        {isSaving ? '...' : 'Asignar'}
      </button>
    </div>
  )
}

type EstadoKey =
  | "pendiente" | "pendiente_sincronizacion" | "sincronizado" | "aprobado" | "rechazado"
  | "en_revision" | "error_sincronizacion"
  | "iniciado" | "revisado" | "en_estudio_credito" | "cancelado"

const estadoConfig: Record<EstadoKey, { label: string; color: string; borderColor: string; cardBg: string; icon: typeof Clock }> = {
  iniciado:              { label: "Iniciado",      color: "bg-slate-500/10 text-slate-500 border-slate-500/20",    borderColor: "border-l-slate-400",  cardBg: "bg-gradient-to-r from-slate-500/5 to-transparent",   icon: Clock },
  revisado:              { label: "En Revisión",   color: "bg-blue-500/10 text-blue-500 border-blue-500/20",       borderColor: "border-l-blue-500",   cardBg: "bg-gradient-to-r from-blue-500/8 to-transparent",    icon: Eye },
  en_estudio_credito:    { label: "En Estudio",    color: "bg-purple-500/10 text-purple-500 border-purple-500/20", borderColor: "border-l-purple-500", cardBg: "bg-gradient-to-r from-purple-500/8 to-transparent",  icon: Eye },
  aprobado:              { label: "Viable",        color: "bg-green-500/10 text-green-500 border-green-500/20",    borderColor: "border-l-green-500",  cardBg: "bg-gradient-to-r from-green-500/8 to-transparent",   icon: CheckCircle },
  cancelado:             { label: "No Viable",     color: "bg-red-500/10 text-red-500 border-red-500/20",          borderColor: "border-l-red-500",    cardBg: "bg-gradient-to-r from-red-500/6 to-transparent",     icon: XCircle },
  pendiente:             { label: "Pendiente",     color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", borderColor: "border-l-yellow-500", cardBg: "bg-gradient-to-r from-yellow-500/8 to-transparent",  icon: Clock },
  pendiente_sincronizacion: { label: "Pend. Sync", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", borderColor: "border-l-yellow-500", cardBg: "bg-gradient-to-r from-yellow-500/8 to-transparent",  icon: Clock },
  sincronizado:          { label: "Sincronizado",  color: "bg-blue-500/10 text-blue-500 border-blue-500/20",       borderColor: "border-l-blue-500",   cardBg: "bg-gradient-to-r from-blue-500/8 to-transparent",    icon: Eye },
  en_revision:           { label: "En Revisión",   color: "bg-blue-500/10 text-blue-500 border-blue-500/20",       borderColor: "border-l-blue-500",   cardBg: "bg-gradient-to-r from-blue-500/8 to-transparent",    icon: Eye },
  rechazado:             { label: "No Viable",     color: "bg-red-500/10 text-red-500 border-red-500/20",          borderColor: "border-l-red-500",    cardBg: "bg-gradient-to-r from-red-500/6 to-transparent",     icon: XCircle },
  error_sincronizacion:  { label: "Error",         color: "bg-red-500/10 text-red-500 border-red-500/20",          borderColor: "border-l-red-500",    cardBg: "bg-gradient-to-r from-red-500/6 to-transparent",     icon: XCircle },
}

interface UserProfile {
  id: string
  email: string
  nombre_completo: string
  telefono: string | null
  rol: string
  activo: boolean
  created_at?: string
}

interface Invitation {
  id: string
  email: string
  rol: string
  usado: boolean
  expires_at: string
  created_at: string
}

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
    window.open(url, '_blank')
  }
}

function fmtFecha(raw: unknown, fallback = 'No registrada'): string {
  if (!raw) return fallback
  const s = String(raw)
  const match = s.match(/(\d{4}-\d{2}-\d{2})/)
  if (!match) return fallback
  const d = new Date(match[1] + 'T12:00:00')
  return isNaN(d.getTime()) ? fallback : d.toLocaleDateString('es-CO')
}

export function AdminDashboard() {
  const { isAdmin, isAuthenticated, loading: authLoading, user: currentUser, profile: currentProfile, signOut } = useAuth()
  const isAnalista = currentProfile?.rol === 'analista'
  const router = useRouter()
  const pathname = usePathname()
  const activeSection: 'caracterizaciones' | 'usuarios' | 'estadisticas' | 'mapa' = pathname.includes('/usuarios')
    ? 'usuarios'
    : pathname.includes('/estadisticas')
      ? 'estadisticas'
      : pathname.includes('/mapa')
        ? 'mapa'
        : 'caracterizaciones'
  const [caracterizaciones, setCaracterizaciones] = useState<CaracterizacionDB[]>([])
  const [estadisticas, setEstadisticas] = useState({ total: 0, pendientes: 0, sincronizados: 0, aprobados: 0, rechazados: 0 })
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [adminMapMarkers, setAdminMapMarkers] = useState<MapMarker[]>([])
  const [selectedCaracterizacion, setSelectedCaracterizacion] = useState<CaracterizacionDB | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CaracterizacionDB | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const parentRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)
  const [observaciones, setObservaciones] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [credencialesEmail, setCredencialesEmail] = useState("")
  const [isSendingCredenciales, setIsSendingCredenciales] = useState(false)
  const [credencialesResult, setCredencialesResult] = useState<{ credenciales: { email: string; password: string }; emailEnviado: boolean } | null>(null)
  // activeSection derivado del pathname — ver arriba
  const [usuarios, setUsuarios] = useState<UserProfile[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteNombre, setInviteNombre] = useState("")
  const [inviteRol, setInviteRol] = useState("asesor")
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [lastInviteResult, setLastInviteResult] = useState<{ mensaje: string; credenciales: { email: string; password: string } | null; emailEnviado: boolean } | null>(null)
  // Asignación de asesor
  const [asesoresDisponibles, setAsesoresDisponibles] = useState<{ id: string; nombre_completo: string }[]>([])
  const [selectedNewAsesorId, setSelectedNewAsesorId] = useState<string>("")
  const [isAssigningAsesor, setIsAssigningAsesor] = useState(false)
  // Cambio de rol
  const [changingRoleUserId, setChangingRoleUserId] = useState<string | null>(null)
  // Búsqueda y paginación de usuarios (server-side)
  const [userSearch, setUserSearch] = useState("")
  const [userPage, setUserPage] = useState(1)
  const [userTotalCount, setUserTotalCount] = useState(0)
  const USERS_PER_PAGE = 20

  const supabase = createClient()

  const openWaze = (lat: number, lng: number) => {
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, "_blank")
  }

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank")
  }

  const loadData = useCallback(async ({
    page: reqPage = 1,
    search = '',
    estado = 'todos',
    append = false,
  }: {
    page?: number
    search?: string
    estado?: string
    append?: boolean
  } = {}) => {
    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }
    try {
      const params = new URLSearchParams({ page: String(reqPage), limit: '50' })
      if (search) params.set('search', search)
      if (estado && estado !== 'todos') params.set('estado', estado)

      const res = await fetch(`/api/admin/caracterizaciones?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al cargar caracterizaciones')

      const items: CaracterizacionDB[] = json.data || []
      const total: number = json.total ?? 0

      setTotalCount(total)
      setHasMore(items.length === 50)
      setPage(reqPage)

      if (append) {
        setCaracterizaciones(prev => [...prev, ...items])
      } else {
        setCaracterizaciones(items)
        setEstadisticas({
          total,
          pendientes: items.filter(c => ['pendiente', 'pendiente_sincronizacion', 'iniciado'].includes((c.estado || '').toLowerCase())).length,
          sincronizados: items.filter(c => ['sincronizado', 'revisado'].includes((c.estado || '').toLowerCase())).length,
          aprobados: items.filter(c => (c.estado || '').toLowerCase() === 'aprobado').length,
          rechazados: items.filter(c => ['rechazado', 'cancelado'].includes((c.estado || '').toLowerCase())).length,
        })
      }
    } catch (err) {
      console.error('Error loading data:', err)
      toast.error('Error al cargar datos del servidor')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  const loadUsers = useCallback(async ({ page = 1, search = '' }: { page?: number; search?: string } = {}) => {
    setIsLoadingUsers(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(USERS_PER_PAGE) })
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Error al cargar usuarios')
      }
      const json = await res.json()

      setUsuarios((json.users || []) as UserProfile[])
      setUserTotalCount(json.total ?? 0)
      setUserPage(page)
      setInvitations((json.invitations || []) as Invitation[])
    } catch (err) {
      console.error('Error loading users:', err)
      toast.error('Error al cargar usuarios')
    } finally {
      setIsLoadingUsers(false)
    }
  }, [])

  const [userToDelete, setUserToDelete] = useState<{ id: string; nombre: string; rol: string } | null>(null)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [isReasignando, setIsReasignando] = useState(false)

  interface DashboardStats {
    porEstado: Record<string, number>
    porMes: { mes: string; total: number }[]
    porMunicipio: { municipio: string; total: number }[]
    porDepartamento: { departamento: string; total: number }[]
    porGenero: { genero: string; total: number }[]
    porAsesor: { nombre: string; total: number }[]
    totalRegistros: number
    promedios: { edad: number | null; personasACargo: number | null; hectareas: number | null }
    asignacion: { conAsesor: number; sinAsesor: number }
  }
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  const deleteUser = async () => {
    if (!userToDelete) return
    setIsDeletingUser(true)
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userToDelete.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')
      toast.success(data.mensaje)
      setUserToDelete(null)
      await loadUsers({ page: 1, search: userSearch })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la cuenta')
    } finally {
      setIsDeletingUser(false)
    }
  }

  const toggleUserActive = async (userId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/toggle-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, activo: !currentActive }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')

      toast.success(data.mensaje)
      await loadUsers({ page: 1, search: userSearch })
    } catch (err) {
      console.error('Error toggling user:', err)
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el estado de la cuenta')
    }
  }

  const getInvitationForEmail = (email: string) => {
    return invitations.find(inv => inv.email === email)
  }

  const handleCreateInvitation = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Ingresa un correo electronico')
      return
    }
    if (!inviteNombre.trim()) {
      toast.error('Ingresa el nombre completo')
      return
    }

    // Verificar que el email no tenga ya un usuario registrado
    const existingUser = usuarios.find(u => u.email === inviteEmail.trim())
    if (existingUser) {
      toast.error('Ya existe un usuario registrado con ese correo')
      return
    }

    // Verificar que no exista ya una invitación para ese correo
    const existingInvitation = invitations.find(inv => inv.email === inviteEmail.trim())
    if (existingInvitation) {
      if (existingInvitation.usado) {
        toast.error('Este correo ya tiene una cuenta activa y ha iniciado sesión')
      } else {
        toast.error('Ya se enviaron credenciales a este correo. El usuario aún no ha iniciado sesión por primera vez.')
      }
      return
    }

    setIsCreatingInvite(true)
    try {
      const res = await fetch('/api/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          nombreCompleto: inviteNombre.trim(),
          rol: inviteRol,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al crear el usuario')
        return
      }

      setLastInviteResult({
        mensaje: data.mensaje,
        credenciales: data.credenciales,
        emailEnviado: data.emailEnviado,
      })

      toast.success(data.emailEnviado ? 'Cuenta creada y credenciales enviadas por email' : 'Cuenta creada exitosamente')
      setInviteEmail('')
      setInviteNombre('')
      await loadUsers({ page: 1, search: userSearch })
    } catch (err) {
      console.error('Error creating invitation:', err)
      toast.error('Error al crear el usuario')
    } finally {
      setIsCreatingInvite(false)
    }
  }

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) return
      const data = await res.json()
      setDashStats(data)
    } catch {
      // Non-critical
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  const loadAsesores = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users?asesores_only=true')
      if (!res.ok) return
      const json = await res.json()
      setAsesoresDisponibles((json.asesores || []) as { id: string; nombre_completo: string }[])
    } catch {
      // No crítico
    }
  }, [])

  const assignAsesor = async (visitaId: string, asesorId: string) => {
    if (!visitaId || !asesorId) return
    setIsAssigningAsesor(true)
    try {
      const res = await fetch('/api/admin/assign-asesor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitaId, asesorId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')
      toast.success(data.mensaje)
      setSelectedNewAsesorId("")
      await loadData({ page: 1, search: searchQuery, estado: filterEstado, append: false })
      // Actualizar el registro seleccionado en el diálogo
      if (selectedCaracterizacion?.visita?.id === visitaId) {
        const res2 = await fetch(`/api/admin/caracterizaciones?limit=1`)
        const json2 = await res2.json()
        const updated = (json2.data || []).find(
          (c: CaracterizacionDB) => c.visita?.id === visitaId
        )
        if (updated) setSelectedCaracterizacion(updated)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al asignar asesor')
    } finally {
      setIsAssigningAsesor(false)
    }
  }

  const changeUserRole = async (userId: string, newRole: string) => {
    setChangingRoleUserId(userId)
    try {
      const res = await fetch('/api/admin/change-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')
      toast.success(data.mensaje)
      await loadUsers({ page: 1, search: userSearch })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar rol')
    } finally {
      setChangingRoleUserId(null)
    }
  }

  // Guard: redirigir si la sesión expiró o se restauró desde bfcache sin auth
  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Cuando el navegador restaura la página desde bfcache (botón Atrás),
  // forzar recarga completa para que el middleware re-evalúe la sesión
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        window.location.reload()
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  useEffect(() => {
    // Siempre cargar datos de caracterizaciones para los contadores del sidebar
    loadData({ page: 1, search: '', estado: 'todos', append: false })
    if (activeSection === 'usuarios') {
      loadUsers({ page: 1, search: '' })
    }
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cargar markers del mapa global cuando el tab de mapa está activo
  useEffect(() => {
    if (activeSection !== 'mapa' || adminMapMarkers.length > 0) return
    const load = async () => {
      try {
        const res = await fetch('/api/admin/caracterizaciones')
        if (!res.ok) return
        const { data } = await res.json()
        if (!data) return
        const markers: MapMarker[] = []
        const seen = new Set<string>()
        for (const c of data as any[]) {
          const predio = c.predio
          if (!predio?.latitud || !predio?.longitud) continue
          if (seen.has(predio.id)) continue
          seen.add(predio.id)
          const benefNombre = c.beneficiario
            ? `${c.beneficiario.nombres || ''} ${c.beneficiario.apellidos || ''}`.trim()
            : 'Sin nombre'
          const temp = c.caracterizacion_predio?.temperatura_celsius
          const popup = `<div style="min-width:180px;font-family:system-ui,sans-serif;">
            <strong style="font-size:14px;">${predio.nombre_predio || 'Sin nombre'}</strong>
            <hr style="margin:4px 0;border-color:#e5e7eb;"/>
            <p style="margin:2px 0;font-size:12px;"><b>Productor:</b> ${benefNombre}</p>
            <p style="margin:2px 0;font-size:12px;"><b>Municipio:</b> ${predio.municipio || 'N/A'}</p>
            ${predio.vereda ? `<p style="margin:2px 0;font-size:12px;"><b>Vereda:</b> ${predio.vereda}</p>` : ''}
            ${predio.area_total_hectareas ? `<p style="margin:2px 0;font-size:12px;"><b>Área total:</b> ${predio.area_total_hectareas} ha</p>` : ''}
            ${predio.area_productiva_hectareas ? `<p style="margin:2px 0;font-size:12px;"><b>Área productiva:</b> ${predio.area_productiva_hectareas} ha</p>` : ''}
            ${temp ? `<p style="margin:2px 0;font-size:12px;"><b>Temperatura:</b> ${temp}°C</p>` : ''}
          </div>`
          const polygonCoords = predio.poligono
            ? (typeof predio.poligono === 'string' ? JSON.parse(predio.poligono) : predio.poligono) as [number, number][]
            : undefined
          markers.push({ id: predio.id, name: predio.nombre_predio || 'Sin nombre', position: [predio.latitud, predio.longitud], popupContent: popup, polygonCoords })
        }
        setAdminMapMarkers(markers)
      } catch { /* silencioso */ }
    }
    load()
  }, [activeSection, adminMapMarkers.length])

  // Debounce: reload from server when search or estado filter changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    const timer = setTimeout(() => {
      loadData({ page: 1, search: searchQuery, estado: filterEstado, append: false })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, filterEstado])

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadData({ page: page + 1, search: searchQuery, estado: filterEstado, append: true })
    }
  }

  // Virtual scroll
  const virtualizer = useVirtualizer({
    count: caracterizaciones.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 110,
    overscan: 5,
  })

  const handleUpdateEstado = async (id: string, nuevoEstado: string) => {
    setIsUpdating(true)
    try {
      const res = await fetch('/api/admin/update-estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nuevoEstado, observaciones: observaciones || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')

      toast.success(`Estado actualizado a "${estadoConfig[nuevoEstado as EstadoKey]?.label || nuevoEstado}"`)
      setObservaciones("")
      // Actualizar el modal inmediatamente sin esperar recarga
      setSelectedCaracterizacion(prev =>
        prev ? { ...prev, estado: nuevoEstado, observaciones: observaciones || prev.observaciones } : prev
      )
      // Recargar la lista en segundo plano
      loadData({ page: 1, search: searchQuery, estado: filterEstado, append: false })
    } catch (err) {
      console.error('Error updating estado:', err)
      toast.error('Error al actualizar el estado')
    } finally {
      setIsUpdating(false)
    }
  }

  const openDetail = (c: CaracterizacionDB) => {
    setSelectedCaracterizacion(c)
    setShowDetail(true)
    setObservaciones(c.observaciones || "")
    setSelectedNewAsesorId("")
    setCredencialesEmail(c.beneficiario?.correo || "")
    setCredencialesResult(null)
    if (isAdmin && asesoresDisponibles.length === 0) loadAsesores()
  }

  const openMapView = (c: CaracterizacionDB) => {
    setSelectedCaracterizacion(c)
    setShowMap(true)
  }

  const handleDeleteCaracterizacion = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/admin/delete-caracterizacion', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caracterizacionId: deleteTarget.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al eliminar')
      setCaracterizaciones(prev => prev.filter(c => c.id !== deleteTarget.id))
      setTotalCount(prev => prev - 1)
      toast.success('Caracterización eliminada correctamente')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  const getNombreCompleto = (c: CaracterizacionDB) => {
    if (!c.beneficiario) return 'Sin nombre'
    return `${c.beneficiario.nombres || ''} ${c.beneficiario.apellidos || ''}`.replace(/\s+/g, ' ').trim() || 'Sin nombre'
  }

  const getEstadoConfig = (estado: string) => {
    const key = (estado || '').toLowerCase() as EstadoKey
    return estadoConfig[key] || estadoConfig.pendiente
  }

  const downloadCSV = (data: CaracterizacionDB[], filename: string) => {
    const headers = [
      // Identificacion
      'Radicado Oficial', 'Radicado Local', 'Estado', 'Fecha Registro', 'Fecha Visita',
      // Beneficiario
      'Nombres', 'Apellidos', 'Tipo Documento', 'Num. Documento',
      'Edad', 'Genero', 'Personas a Cargo', 'Telefono', 'Correo', 'Ocupacion Principal',
      // Predio
      'Nombre Predio', 'Departamento', 'Municipio', 'Vereda', 'Direccion',
      'Tipo Tenencia', 'Codigo Catastral', 'Area Total (Ha)', 'Area Productiva (Ha)',
      'Latitud', 'Longitud', 'Altitud (msnm)',
      'Vive en Predio', 'Tiene Vivienda', 'Cultivos Existentes',
      // Caracterizacion predio
      'Topografia', 'Cobertura Vegetal', 'Ruta Acceso',
      'Distancia (km)', 'Tiempo Acceso', 'Temperatura (C)', 'Meses Lluvia',
      // Area productiva
      'Sistema Productivo', 'Caracterizacion Cultivo', 'Cantidad Produccion', 'Estado Cultivo',
      'Donde Comercializa', 'Ingreso Mensual Ventas', 'Interesado Programa',
      // Financiero
      'Ingresos Agropecuarios/mes', 'Otros Ingresos/mes', 'Egresos/mes',
      'Activos Totales', 'Activos Agropecuarios', 'Pasivos Totales',
      // Autorizaciones
      'Autoriza Datos Personales', 'Autoriza Aviso Privacidad',
      // Tecnico
      'Tecnico / Asesor', 'Asesor Email',
    ]

    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }

    const bool = (v: boolean | null | undefined) => v ? 'Si' : (v === false ? 'No' : '')
    const money = (v: number | null | undefined) => v != null ? String(v) : ''

    const rows = data.map(c => [
      c.radicado_oficial || '',
      c.radicado_local || '',
      c.estado || '',
      c.created_at ? new Date(c.created_at).toLocaleDateString('es-CO') : '',
      c.visita?.fecha_visita || '',
      c.beneficiario?.nombres || '',
      c.beneficiario?.apellidos || '',
      c.beneficiario?.tipo_documento || '',
      c.beneficiario?.numero_documento || '',
      c.beneficiario?.edad ?? '',
      c.beneficiario?.genero || '',
      c.beneficiario?.personas_a_cargo ?? '',
      c.beneficiario?.telefono || '',
      c.beneficiario?.correo || '',
      c.beneficiario?.ocupacion_principal || '',
      c.predio?.nombre_predio || '',
      c.predio?.departamento || '',
      c.predio?.municipio || '',
      c.predio?.vereda || '',
      c.predio?.direccion || '',
      c.predio?.tipo_tenencia || '',
      c.predio?.codigo_catastral || '',
      c.predio?.area_total_hectareas ?? '',
      c.predio?.area_productiva_hectareas ?? '',
      c.predio?.latitud ?? '',
      c.predio?.longitud ?? '',
      c.predio?.altitud_msnm ?? '',
      c.predio?.vive_en_predio || '',
      bool(c.predio?.tiene_vivienda),
      c.predio?.cultivos_existentes || '',
      c.caracterizacion_predio?.topografia || '',
      [c.caracterizacion_predio?.cobertura_bosque && 'Bosque', c.caracterizacion_predio?.cobertura_cultivos && 'Cultivos', c.caracterizacion_predio?.cobertura_pastos && 'Pastos', c.caracterizacion_predio?.cobertura_rastrojo && 'Rastrojo'].filter(Boolean).join(', '),
      c.caracterizacion_predio?.ruta_acceso || '',
      c.caracterizacion_predio?.distancia_km ?? '',
      c.caracterizacion_predio?.tiempo_acceso || '',
      c.caracterizacion_predio?.temperatura_celsius ?? '',
      c.caracterizacion_predio?.meses_lluvia || '',
      c.area_productiva?.sistema_productivo || '',
      c.area_productiva?.caracterizacion_cultivo || '',
      c.area_productiva?.cantidad_produccion || '',
      c.area_productiva?.estado_cultivo || '',
      c.area_productiva?.donde_comercializa || '',
      money(c.area_productiva?.ingreso_mensual_ventas),
      bool(c.area_productiva?.interesado_programa),
      money(c.informacion_financiera?.ingresos_mensuales_agropecuaria),
      money(c.informacion_financiera?.ingresos_mensuales_otros),
      money(c.informacion_financiera?.egresos_mensuales),
      money(c.informacion_financiera?.activos_totales),
      money(c.informacion_financiera?.activos_agropecuaria),
      money(c.informacion_financiera?.pasivos_totales),
      bool(c.autorizacion_datos_personales),
      bool(c.autorizacion_aviso_privacidad),
      c.visita?.nombre_tecnico || c.asesor?.nombre_completo || '',
      c.asesor?.email || '',
    ].map(escape))

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Archivo descargado: ${filename}`)
  }

  const generatePDF = (cTyped: CaracterizacionDB) => {
    const c: any = cTyped
    const nombre = getNombreCompleto(cTyped)
    const fechaGen = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    const estadoLabel = getEstadoConfig(c.estado).label

    const field = (label: string, value: string | number | null | undefined) =>
      value != null && value !== ''
        ? `<div class="field"><span class="lbl">${label}:</span> <span class="val">${value}</span></div>`
        : ''

    const tag = (label: string, active: boolean | null | undefined) =>
      active ? `<span class="tag">${label}</span>` : ''

    const money = (v: number | null | undefined) =>
      v != null ? `$${Number(v).toLocaleString('es-CO')}` : null

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Caracterizacion — ${nombre}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:10.5px;color:#111;background:#fff}
    .page{padding:14mm 12mm;max-width:210mm;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #16a34a;padding-bottom:10px;margin-bottom:14px}
    .logo{font-size:18px;font-weight:900;color:#16a34a;letter-spacing:-0.5px}
    .logo-sub{font-size:9px;color:#555;margin-top:2px}
    .header-right{text-align:right}
    .doc-title{font-size:12px;font-weight:700;text-transform:uppercase;color:#111;margin-bottom:3px}
    .radicado{font-family:monospace;font-size:9.5px;color:#555}
    .estado-badge{display:inline-block;padding:2px 7px;border-radius:99px;font-size:9px;font-weight:700;margin-top:3px;background:#dcfce7;color:#15803d}
    h2{font-size:11px;font-weight:700;color:#15803d;border-left:3px solid #16a34a;padding:2px 0 2px 7px;margin:12px 0 7px;text-transform:uppercase;letter-spacing:0.4px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:3px 18px}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px 12px}
    .field{margin-bottom:4px;line-height:1.4}
    .lbl{color:#555;font-size:9.5px}
    .val{font-weight:600;font-size:10px;color:#111}
    .tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
    .tag{padding:2px 7px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;font-size:9px;color:#15803d;font-weight:600}
    .tag-blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
    .tag-red{background:#fef2f2;border-color:#fecaca;color:#dc2626}
    .section-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:5px;padding:8px 10px;margin-bottom:10px}
    .divider{border:none;border-top:1px solid #e5e7eb;margin:10px 0}
    .footer{margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px;display:flex;justify-content:space-between;color:#9ca3af;font-size:8.5px}
    .auth-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:4px}
    .auth-item{padding:2px 8px;border-radius:4px;font-size:9px;font-weight:600}
    .auth-ok{background:#dcfce7;color:#15803d}
    .auth-no{background:#fee2e2;color:#dc2626}
    @page{size:A4;margin:10mm}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo">Santander Agro360</div>
      <div class="logo-sub">Sistema de Caracterizacion Agropecuaria — Santander, Colombia</div>
    </div>
    <div class="header-right">
      <div class="doc-title">Ficha de Caracterizacion Predial</div>
      <div class="radicado">Radicado: ${c.radicado_oficial || c.radicado_local}</div>
      <div class="radicado">Generado: ${fechaGen}</div>
      <div class="estado-badge">${estadoLabel}</div>
    </div>
  </div>

  <!-- Beneficiario -->
  <h2>Datos del Productor</h2>
  <div class="section-box">
    <div class="grid2">
      ${field('Nombre completo', nombre)}
      ${field('Tipo documento', c.beneficiario?.tipo_documento)}
      ${field('Num. documento', c.beneficiario?.numero_documento)}
      ${field('Edad', c.beneficiario?.edad ? `${c.beneficiario.edad} años` : null)}
      ${field('Telefono', c.beneficiario?.telefono)}
      ${field('Correo', c.beneficiario?.correo)}
      ${field('Ocupacion', c.beneficiario?.ocupacion_principal)}
      ${field('Municipio', c.predio?.municipio)}
      ${field('Vereda', c.predio?.vereda)}
    </div>
  </div>

  <!-- Predio -->
  <h2>Datos del Predio</h2>
  <div class="section-box">
    <div class="grid3">
      ${field('Nombre predio', c.predio?.nombre_predio)}
      ${field('Departamento', c.predio?.departamento)}
      ${field('Municipio', c.predio?.municipio)}
      ${field('Vereda', c.predio?.vereda)}
      ${field('Tipo tenencia', c.predio?.tipo_tenencia)}
      ${field('Codigo catastral', c.predio?.codigo_catastral)}
      ${field('Area total', c.predio?.area_total_hectareas ? `${c.predio.area_total_hectareas} ha` : null)}
      ${field('Area productiva', c.predio?.area_productiva_hectareas ? `${c.predio.area_productiva_hectareas} ha` : null)}
      ${field('Altitud', c.predio?.altitud_msnm ? `${c.predio.altitud_msnm} msnm` : null)}
      ${field('Coordenadas', c.predio?.latitud && c.predio?.longitud ? `${parseFloat(String(c.predio.latitud)).toFixed(5)}, ${parseFloat(String(c.predio.longitud)).toFixed(5)}` : null)}
      ${field('Vive en predio', c.predio?.vive_en_predio ? 'Si' : (c.predio?.vive_en_predio === false ? 'No' : null))}
      ${field('Acceso vial', c.predio?.acceso_vial)}
      ${field('Cultivos existentes', c.predio?.cultivos_existentes)}
    </div>
  </div>

  <!-- Caracterizacion predio -->
  ${c.caracterizacion_predio ? `
  <h2>Caracterizacion del Predio</h2>
  <div class="section-box">
    <div class="grid3">
      ${field('Topografia', c.caracterizacion_predio.topografia)}
      ${field('Tipo suelo', c.caracterizacion_predio.tipo_suelo)}
      ${field('Cobertura vegetal', [c.caracterizacion_predio.cobertura_bosque && 'Bosque', c.caracterizacion_predio.cobertura_cultivos && 'Cultivos', c.caracterizacion_predio.cobertura_pastos && 'Pastos', c.caracterizacion_predio.cobertura_rastrojo && 'Rastrojo'].filter(Boolean).join(', ') || null)}
      ${field('Ruta acceso', c.caracterizacion_predio.ruta_acceso)}
      ${field('Distancia', c.caracterizacion_predio.distancia_km ? `${c.caracterizacion_predio.distancia_km} km` : null)}
      ${field('Tiempo acceso', c.caracterizacion_predio.tiempo_acceso)}
      ${field('Temperatura', c.caracterizacion_predio.temperatura_celsius ? `${c.caracterizacion_predio.temperatura_celsius} °C` : null)}
      ${field('Meses lluvia', c.caracterizacion_predio.meses_lluvia)}
    </div>
  </div>` : ''}

  <!-- Agua y riesgos -->
  ${c.predio?.fuente_agua ? `
  <h2>Abastecimiento de Agua</h2>
  <div class="section-box">${field('Fuente', c.predio.fuente_agua)}</div>` : ''}

  <!-- Area productiva -->
  ${c.area_productiva ? `
  <h2>Area Productiva</h2>
  <div class="section-box">
    <div class="grid3">
      ${field('Cultivo principal', c.area_productiva.cultivo_principal)}
      ${field('Area cultivo', c.area_productiva.area_cultivo_principal ? `${c.area_productiva.area_cultivo_principal} ha` : null)}
      ${field('Estado cultivo', c.area_productiva.estado_cultivo)}
      ${field('Sistema productivo', c.area_productiva.sistema_productivo)}
      ${field('Prod. estimada', c.area_productiva.produccion_estimada ? `${c.area_productiva.produccion_estimada} ton` : null)}
      ${field('Destino produccion', c.area_productiva.destino_produccion)}
      ${field('Donde comercializa', c.area_productiva.donde_comercializa)}
      ${field('Ingreso mensual', money(c.area_productiva.ingreso_mensual_ventas))}
      ${field('Caracterizacion cultivo', c.area_productiva.caracterizacion_cultivo)}
    </div>
  </div>` : ''}

  <!-- Info financiera -->
  ${c.informacion_financiera ? `
  <h2>Informacion Financiera</h2>
  <div class="section-box">
    <div class="grid3">
      ${field('Ingresos agropecuarios', money(c.informacion_financiera.ingresos_mensuales_agropecuaria))}
      ${field('Otros ingresos', money(c.informacion_financiera.ingresos_mensuales_otros))}
      ${field('Egresos mensuales', money(c.informacion_financiera.egresos_mensuales))}
      ${field('Activos totales', money(c.informacion_financiera.activos_totales))}
      ${field('Pasivos totales', money(c.informacion_financiera.pasivos_totales))}
    </div>
  </div>` : ''}

  <!-- Registro -->
  <h2>Datos del Registro</h2>
  <div class="section-box">
    <div class="grid3">
      ${field('Tecnico / Asesor', c.visita?.nombre_tecnico || c.asesor?.nombre_completo)}
      ${field('Correo asesor', c.asesor?.email)}
      ${field('Fecha visita', fmtFecha(c.visita?.fecha_visita, 'No registrada'))}
      ${field('Fecha registro', c.created_at ? new Date(c.created_at).toLocaleDateString('es-CO') : null)}
      ${field('Radicado local', c.radicado_local)}
      ${field('Radicado oficial', c.radicado_oficial)}
    </div>
  </div>

  <!-- Autorizaciones -->
  <h2>Autorizaciones</h2>
  <div class="section-box">
    <div class="auth-row">
      <span class="auth-item ${c.autorizacion_datos_personales ? 'auth-ok' : 'auth-no'}">
        ${c.autorizacion_datos_personales ? '✓' : '✗'} Tratamiento de datos personales
      </span>
      <span class="auth-item ${c.autorizacion_aviso_privacidad ? 'auth-ok' : 'auth-no'}">
        ${c.autorizacion_aviso_privacidad ? '✓' : '✗'} Aviso de privacidad
      </span>
    </div>
    ${c.observaciones ? `<div style="margin-top:8px">${field('Observaciones', c.observaciones)}</div>` : ''}
  </div>

  <div class="footer">
    <span>Santander Agro360 — Sistema de Caracterizacion Agropecuaria</span>
    <span>Documento generado el ${fechaGen}</span>
  </div>
</div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) {
      toast.error('Permite las ventanas emergentes para generar el PDF')
      return
    }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
    }, 500)
  }

  // Paginación server-side: `usuarios` ya contiene solo la página actual
  const userTotalPages = Math.max(1, Math.ceil(userTotalCount / USERS_PER_PAGE))
  const paginatedUsuarios = usuarios

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-0">
          {/* Tabs de sección — visibles solo en mobile donde el sidebar está oculto */}
          <div className="mb-4 flex flex-wrap gap-2 md:hidden">
            <Button
              variant={activeSection === 'caracterizaciones' ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => router.push('/admin/caracterizaciones')}
            >
              <FileText className="h-4 w-4" />
              Caracterizaciones
            </Button>
            {!isAnalista && (
              <Button
                variant={activeSection === 'usuarios' ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => router.push('/admin/usuarios')}
              >
                <Users className="h-4 w-4" />
                Usuarios
              </Button>
            )}
            <Button
              variant={activeSection === 'estadisticas' ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => router.push('/admin/estadisticas')}
            >
              <BarChart2 className="h-4 w-4" />
              Estadísticas
            </Button>
            {!isAnalista && (
              <Button
                variant={activeSection === 'mapa' ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => router.push('/admin/mapa')}
              >
                <Map className="h-4 w-4" />
                Mapa
              </Button>
            )}
          </div>

          {activeSection === 'caracterizaciones' && (
            <motion.div key="caracterizaciones" variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col flex-1 min-h-0"><>
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold">Caracterizaciones</h2>
                  <p className="text-sm text-muted-foreground">Revisa, filtra y gestiona todas las caracterizaciones prediales registradas</p>
                </div>
                <span className="text-sm text-muted-foreground shrink-0">{totalCount} registro{totalCount !== 1 ? 's' : ''}</span>
              </div>
              {/* Filters */}
              <div className="mb-6 flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar nombre, predio, municipio, asesor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full"
                    />
                  </div>
                  <Select value={filterEstado} onValueChange={setFilterEstado}>
                    <SelectTrigger className="w-28 shrink-0 sm:w-36">
                      <Filter className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="INICIADO">Iniciado</SelectItem>
                      <SelectItem value="REVISADO">En Revisión</SelectItem>
                      <SelectItem value="EN_ESTUDIO_CREDITO">En Estudio Crédito</SelectItem>
                      <SelectItem value="APROBADO">Viable</SelectItem>
                      <SelectItem value="CANCELADO">No Viable</SelectItem>
                      {isAdmin && <SelectItem value="sin_asesor">Sin Asesor</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {caracterizaciones.length} cargados de {totalCount} total(es)
                  </p>
                  {caracterizaciones.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        const fecha = new Date().toISOString().split('T')[0]
                        downloadCSV(caracterizaciones, `encuestas-${fecha}.csv`)
                      }}
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden xs:inline">Descargar</span> CSV
                    </Button>
                  )}
                </div>
              </div>

              {/* Loading */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Cargando caracterizaciones...</span>
                  </div>
                </div>
              ) : caracterizaciones.length === 0 ? (
                <Card className="py-12 text-center">
                  <CardContent>
                    <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mb-2 text-lg font-medium">No hay caracterizaciones</h3>
                    <p className="text-sm text-muted-foreground">
                      {totalCount === 0
                        ? "Aun no se han sincronizado caracterizaciones al servidor"
                        : "No se encontraron resultados con los filtros aplicados"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Virtual scroll container */}
                  <div
                    ref={parentRef}
                    style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
                    className="rounded-md"
                  >
                    <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                      {virtualizer.getVirtualItems().map((virtualRow) => {
                        const c = caracterizaciones[virtualRow.index]
                        if (!c) return null
                        const config = getEstadoConfig(c.estado)
                        const Icon = config.icon
                        return (
                          <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              transform: `translateY(${virtualRow.start}px)`,
                              paddingBottom: '12px',
                            }}
                          >
                            <Card className={`border-l-4 ${config.borderColor ?? 'border-l-slate-400'} ${config.cardBg ?? ''} border-border/60 transition-all duration-150 hover:-translate-y-0.5`} style={{boxShadow:'var(--shadow-sm)'}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.boxShadow='var(--shadow-md)'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.boxShadow='var(--shadow-sm)'}>
                              <CardContent className="p-3 sm:p-4">
                                <div className="flex items-start gap-3">
                                  <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <Users className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <h3 className="font-medium leading-tight">{getNombreCompleto(c)}</h3>
                                      <Badge variant="outline" className={`${config.color} shrink-0 text-[10px] px-1.5 py-0`}>
                                        <Icon className="mr-1 h-2.5 w-2.5" />
                                        {config.label}
                                      </Badge>
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                      {c.beneficiario?.numero_documento && (
                                        <span className="flex items-center gap-1 font-mono">
                                          <User className="h-3 w-3 shrink-0" />
                                          {c.beneficiario.numero_documento}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        <span className="max-w-[110px] truncate sm:max-w-none">{c.predio?.nombre_predio || 'Sin predio'}</span>
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Map className="h-3 w-3 shrink-0" />
                                        {c.predio?.municipio || 'Sin municipio'}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3 shrink-0" />
                                        {new Date(c.created_at).toLocaleDateString('es-CO')}
                                      </span>
                                      {!c.visita?.asesor_id && (
                                        <span className="flex items-center gap-1 text-blue-500">
                                          <User className="h-3 w-3 shrink-0" />
                                          Sin asesor
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    {c.predio?.latitud && c.predio?.longitud && (
                                      <Button variant="outline" size="icon" onClick={() => openMapView(c)} className="h-9 w-9">
                                        <Map className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                    <Button variant="default" size="icon" onClick={() => openDetail(c)} className="h-9 w-9">
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    {isAdmin && (
                                      <Button variant="outline" size="icon" onClick={() => setDeleteTarget(c)} className="h-9 w-9 border-destructive/40 text-destructive hover:bg-destructive/10">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Paginador */}
                  {totalCount > 0 && (() => {
                    const totalPages = Math.max(1, Math.ceil(totalCount / 50))
                    return (
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                        <p className="text-sm text-muted-foreground">
                          {totalCount} registro{totalCount !== 1 ? 's' : ''} · Pág. {page} de {totalPages}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            variant="outline" size="sm"
                            disabled={page === 1 || isLoading}
                            onClick={() => loadData({ page: page - 1, search: searchQuery, estado: filterEstado })}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline" size="sm"
                            disabled={page >= totalPages || isLoading}
                            onClick={() => loadData({ page: page + 1, search: searchQuery, estado: filterEstado })}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </></motion.div>
          )}

          {/* Seccion Usuarios */}
          {activeSection === 'usuarios' && (
            <motion.div key="usuarios" variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col flex-1 min-h-0">
            <div className="flex flex-col flex-1 min-h-0 gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Gestión de Usuarios</h2>
                  <p className="text-sm text-muted-foreground">Administra las cuentas de asesores y sus permisos de acceso</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => loadUsers({ page: userPage, search: userSearch })} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Actualizar</span>
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="gap-2 border-yellow-500/40 text-yellow-700 hover:bg-yellow-500/10 dark:text-yellow-400"
                    disabled={isReasignando}
                    onClick={async () => {
                      setIsReasignando(true)
                      try {
                        const res = await fetch('/api/admin/reasignar-huerfanos', { method: 'POST' })
                        const data = await res.json()
                        if (!res.ok) throw new Error(data.error)
                        toast.success(data.mensaje)
                        loadData({ page: 1, search: searchQuery, estado: filterEstado })
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Error al reasignar')
                      } finally {
                        setIsReasignando(false)
                      }
                    }}
                  >
                    {isReasignando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="hidden sm:inline">Reasignar desactualizados</span>
                    <span className="sm:hidden">Reasignar</span>
                  </Button>
                  <Button size="sm" onClick={() => { setShowInviteForm(!showInviteForm); setLastInviteResult(null) }} className="gap-2">
                    <Mail className="h-4 w-4" />
                    Invitar Usuario
                  </Button>
                </div>
              </div>

              {/* Formulario de creacion de usuario */}
              {showInviteForm && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Mail className="h-4 w-4 text-primary" />
                        Crear Usuario
                      </CardTitle>
                      <button
                        type="button"
                        onClick={() => { setShowInviteForm(false); setLastInviteResult(null) }}
                        className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Cerrar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <CardDescription>
                      Crea una cuenta para un asesor o beneficiario. Las credenciales se envian automaticamente por email.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Input
                        placeholder="Nombre completo"
                        value={inviteNombre}
                        onChange={(e) => setInviteNombre(e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Correo electronico"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="flex-1"
                        type="email"
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Select value={inviteRol} onValueChange={setInviteRol}>
                        <SelectTrigger className="w-full sm:w-44">
                          <SelectValue placeholder="Rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asesor">Asesor</SelectItem>
                          <SelectItem value="analista">Analista</SelectItem>
                          <SelectItem value="agricultor">Agricultor</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleCreateInvitation}
                        disabled={isCreatingInvite || !inviteEmail.trim() || !inviteNombre.trim()}
                        className="gap-2"
                      >
                        {isCreatingInvite ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        Crear y Enviar Credenciales
                      </Button>
                    </div>

                    {lastInviteResult && (
                      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                        <p className="mb-2 text-sm font-medium text-green-700 dark:text-green-400">
                          {lastInviteResult.emailEnviado ? '✓ Credenciales enviadas por email' : '✓ Cuenta creada (email no enviado — configura SMTP)'}
                        </p>
                        {lastInviteResult.credenciales && (
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground w-20">Email:</span>
                              <code className="rounded bg-card px-2 py-0.5">{lastInviteResult.credenciales.email}</code>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground w-20">Contraseña:</span>
                              <code className="rounded bg-card px-2 py-0.5 font-bold">{lastInviteResult.credenciales.password}</code>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  navigator.clipboard.writeText(lastInviteResult!.credenciales!.password)
                                  toast.success('Contraseña copiada')
                                }}
                              >
                                Copiar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Buscador de usuarios */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={userSearch}
                  onChange={e => {
                    const val = e.target.value
                    setUserSearch(val)
                    clearTimeout((window as any)._userSearchTimer)
                      ; (window as any)._userSearchTimer = setTimeout(() => {
                        loadUsers({ page: 1, search: val })
                      }, 350)
                  }}
                  className="pl-9"
                />
              </div>

              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Cargando usuarios...</span>
                  </div>
                </div>
              ) : usuarios.length === 0 ? (
                <Card className="py-12 text-center">
                  <CardContent>
                    <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mb-2 text-lg font-medium">No hay usuarios registrados</h3>
                    <p className="text-sm text-muted-foreground">
                      Los asesores se registran usando codigos de invitacion
                    </p>
                  </CardContent>
                </Card>
              ) : paginatedUsuarios.length === 0 ? (
                <Card className="py-8 text-center">
                  <CardContent>
                    <p className="text-sm text-muted-foreground">No se encontraron usuarios con "{userSearch}"</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
                  {paginatedUsuarios.map((u) => {
                    const invitation = getInvitationForEmail(u.email)
                    return (
                      <Card key={u.id} className={`border-l-4 border-border/60 transition-all duration-150 hover:-translate-y-0.5 ${
                        !u.activo ? 'border-l-red-500 bg-gradient-to-r from-red-500/5 to-transparent opacity-75' :
                        u.rol === 'admin' ? 'border-l-orange-500 bg-gradient-to-r from-orange-500/8 to-transparent' :
                        u.rol === 'analista' ? 'border-l-purple-500 bg-gradient-to-r from-purple-500/8 to-transparent' :
                        u.rol === 'agricultor' || u.rol === 'campesino' ? 'border-l-green-500 bg-gradient-to-r from-green-500/8 to-transparent' :
                        'border-l-blue-500 bg-gradient-to-r from-blue-500/8 to-transparent'
                      }`} style={{boxShadow:'var(--shadow-sm)'}}>
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${u.activo ? 'bg-primary/10' : 'bg-red-500/10'}`}>
                              {u.activo ? <User className="h-4 w-4 text-primary" /> : <UserX className="h-4 w-4 text-red-500" />}
                            </div>

                            {/* Info — nombre, badges, contacto */}
                            <div className="min-w-0 flex-1">
                              {/* Nombre — línea propia con truncate real */}
                              <p className="truncate font-medium text-sm leading-tight">{u.nombre_completo || 'Sin nombre'}</p>

                              {/* Badges en línea separada */}
                              <div className="mt-1 flex flex-wrap gap-1">
                                <Badge variant="outline" className={`text-xs ${
                                  u.rol === 'admin' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                  u.rol === 'analista' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                                  u.rol === 'agricultor' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                  'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                }`}>
                                  {u.rol === 'admin' ? 'Admin' : u.rol === 'analista' ? 'Analista' : u.rol === 'agricultor' ? 'Agricultor' : 'Asesor'}
                                </Badge>
                                {invitation && (
                                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                    {invitation.usado ? 'Accedió' : 'Invitado'}
                                  </Badge>
                                )}
                                {!u.activo && (
                                  <Badge variant="destructive" className="text-xs">Inhabilitado</Badge>
                                )}
                              </div>

                              {/* Contacto */}
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1 min-w-0">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[180px]">{u.email}</span>
                                </span>
                                {u.telefono && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{u.telefono}</span>}
                                {u.created_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(u.created_at).toLocaleDateString('es-CO', {day:'2-digit',month:'short',year:'2-digit'})}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Acciones */}
                          {/* Acciones — siempre debajo del info */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-12">
                            {/* Selector de rol — solo admin, no sobre sí mismo */}
                            {isAdmin && u.id !== currentUser?.id && (
                              <div className="flex items-center gap-1">
                                {changingRoleUserId === u.id && (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                                <Select
                                  value={u.rol}
                                  onValueChange={(newRol) => changeUserRole(u.id, newRol)}
                                  disabled={changingRoleUserId === u.id}
                                >
                                  <SelectTrigger className="h-9 w-32 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                    <SelectItem value="asesor">Asesor</SelectItem>
                                    <SelectItem value="analista">Analista</SelectItem>
                                    <SelectItem value="agricultor">Agricultor</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            {u.rol !== 'admin' && (
                              <>
                                <Button
                                  variant={u.activo ? "outline" : "default"}
                                  size="sm"
                                  onClick={() => toggleUserActive(u.id, u.activo)}
                                  className={`gap-1.5 ${u.activo ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-950' : 'bg-green-600 hover:bg-green-700'}`}
                                >
                                  {u.activo ? (
                                    <>
                                      <UserX className="h-4 w-4" />
                                      Inhabilitar
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4" />
                                      Habilitar
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setUserToDelete({ id: u.id, nombre: u.nombre_completo || u.email, rol: u.rol })}
                                  className="gap-1.5 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-950"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Eliminar
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                </div>

                  {/* Paginación usuarios — fuera del scroll, siempre visible */}
                  {userTotalPages > 1 && (
                    <div className="shrink-0 flex items-center justify-between border-t border-border pt-3">
                      <p className="text-sm text-muted-foreground">
                        {userTotalCount} usuario{userTotalCount !== 1 ? 's' : ''} · Pág. {userPage} de {userTotalPages}
                      </p>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" disabled={userPage === 1 || isLoadingUsers} onClick={() => loadUsers({ page: userPage - 1, search: userSearch })}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={userPage >= userTotalPages || isLoadingUsers} onClick={() => loadUsers({ page: userPage + 1, search: userSearch })}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Invitaciones pendientes */}
              {invitations.filter(i => !i.usado).length > 0 && (
                <div className="mt-8 space-y-4">
                  <h3 className="text-base font-semibold text-muted-foreground">Invitaciones Pendientes</h3>
                  <div className="space-y-2">
                    {invitations.filter(i => !i.usado).map((inv) => (
                      <Card key={inv.id} className="border-yellow-500/20 bg-yellow-500/5">
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10">
                            <Mail className="h-5 w-5 text-yellow-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium">{inv.email}</p>
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                <Clock className="mr-1 h-3 w-3" />
                                Pendiente
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Rol: {inv.rol} | Expira: {new Date(inv.expires_at).toLocaleDateString()}
                              {new Date(inv.expires_at) < new Date() && (
                                <span className="ml-2 text-red-500">(Expirada)</span>
                              )}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </motion.div>
          )}

          {/* Sección Estadísticas */}
          {activeSection === 'estadisticas' && (<motion.div key="estadisticas" variants={fadeUp} initial="hidden" animate="visible" className="flex-1 overflow-y-auto -m-4 md:-m-6 p-4 md:p-6">{(() => {
            const estadoColors: Record<string, string> = {
              INICIADO: '#94a3b8',
              REVISADO: '#3b82f6',
              EN_ESTUDIO_CREDITO: '#a855f7',
              APROBADO: '#22c55e',
              CANCELADO: '#ef4444',
              RECHAZADO: '#ef4444',
              SINCRONIZADO: '#3b82f6',
            }
            const estadoLabels: Record<string, string> = {
              INICIADO: 'Iniciado',
              REVISADO: 'En Revisión',
              EN_ESTUDIO_CREDITO: 'En Estudio',
              APROBADO: 'Viable',
              CANCELADO: 'No Viable',
              RECHAZADO: 'No Viable',
              SINCRONIZADO: 'Sincronizado',
            }
            const estadosChartData = dashStats
              ? Object.entries(dashStats.porEstado)
                  .filter(([, v]) => v > 0)
                  .map(([key, value]) => ({
                    name: estadoLabels[key] || key,
                    value,
                    fill: estadoColors[key] || '#94a3b8',
                  }))
              : []

            const genderLabels: Record<string, string> = {
              M: 'Masculino', F: 'Femenino', Masculino: 'Masculino', Femenino: 'Femenino',
            }
            const genderColors = ['#3b82f6', '#ec4899', '#f59e0b', '#94a3b8']
            const genderData = (dashStats?.porGenero || []).map((g, i) => ({
              name: genderLabels[g.genero] || g.genero,
              value: g.total,
              fill: genderColors[i % genderColors.length],
            }))

            const mesFormatter = (mes: string) => {
              const [y, m] = mes.split('-')
              const d = new Date(parseInt(y), parseInt(m) - 1, 1)
              return d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
            }

            const viables = dashStats?.porEstado['APROBADO'] || 0
            const total = dashStats?.totalRegistros || 0
            const viablePct = total > 0 ? Math.round((viables / total) * 100) : 0

            return (
              <div className="space-y-6 pb-6">

                {/* Header */}
                <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
                  <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
                  <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Estadísticas del Sistema
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">Análisis de caracterizaciones y productores registrados</p>
                    </div>
                    {dashStats && (
                      <div className="flex items-center gap-2 rounded-lg bg-background/60 px-4 py-2 backdrop-blur-sm border border-border/40">
                        <span className="text-3xl font-bold text-foreground">{dashStats.totalRegistros}</span>
                        <div>
                          <p className="text-xs font-medium text-foreground leading-tight">Total</p>
                          <p className="text-xs text-muted-foreground">registros</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isLoadingStats ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Cargando estadísticas...</span>
                    </div>
                  </div>
                ) : !dashStats ? (
                  <Card className="py-12 text-center">
                    <CardContent>
                      <BarChart2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No hay datos disponibles</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* KPI Cards — con borde izquierdo coloreado */}
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                    >
                      {[
                        { label: 'Viables', value: viables, sub: `${viablePct}% del total`, icon: CheckCircle, color: 'text-green-500', border: 'border-l-green-500', bg: 'bg-green-500/5' },
                        { label: 'En Revisión', value: dashStats.porEstado['REVISADO'] || 0, sub: 'En proceso', icon: Eye, color: 'text-blue-500', border: 'border-l-blue-500', bg: 'bg-blue-500/5' },
                        { label: 'En Estudio', value: dashStats.porEstado['EN_ESTUDIO_CREDITO'] || 0, sub: 'Crédito', icon: TrendingUp, color: 'text-purple-500', border: 'border-l-purple-500', bg: 'bg-purple-500/5' },
                        { label: 'No Viables', value: (dashStats.porEstado['CANCELADO'] || 0) + (dashStats.porEstado['RECHAZADO'] || 0), sub: 'Cancelados', icon: XCircle, color: 'text-red-500', border: 'border-l-red-500', bg: 'bg-red-500/5' },
                      ].map(({ label, value, sub, icon: Icon, color, border, bg }) => (
                        <motion.div key={label} variants={staggerItem}>
                          <Card className={`border-l-4 ${border} ${bg} transition-all duration-200 hover:-translate-y-0.5`} style={{boxShadow: 'var(--shadow-sm)'}}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                                <Icon className={`h-4 w-4 ${color}`} />
                              </div>
                              <p className={`text-3xl font-bold ${color}`}>{value}</p>
                              <p className={`text-xs mt-1 ${color} opacity-70`}>{sub}</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </motion.div>

                    {/* Promedios — fila de métricas secundarias */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        dashStats.promedios.edad != null && { label: 'Edad promedio', value: dashStats.promedios.edad, unit: 'años' },
                        dashStats.promedios.personasACargo != null && { label: 'Personas a cargo', value: dashStats.promedios.personasACargo, unit: 'prom.' },
                        dashStats.promedios.hectareas != null && { label: 'Hectáreas prom.', value: dashStats.promedios.hectareas, unit: 'ha' },
                        { label: 'Con asesor asignado', value: dashStats.asignacion.conAsesor, unit: `/ ${dashStats.asignacion.conAsesor + dashStats.asignacion.sinAsesor}` },
                      ].filter(Boolean).map((item: any) => (
                        <Card key={item.label} className="bg-muted/30 border-border/60">
                          <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground mb-2">{item.label}</p>
                            <p className="text-2xl font-bold">{item.value} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span></p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Tendencia mensual — ancho completo y prominente */}
                    <Card className="border-l-4 border-l-primary bg-primary/5 border-border/60" style={{boxShadow: 'var(--shadow-sm)'}}>
                      <CardHeader className="pb-1 pt-4 px-5">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Registros por mes
                          </CardTitle>
                          <CardDescription>Últimos 12 meses</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="px-2 pb-3">
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={dashStats.porMes} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                            <defs>
                              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="oklch(0.45 0.18 145)" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="oklch(0.45 0.18 145)" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickFormatter={mesFormatter} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }}
                              labelFormatter={(v) => mesFormatter(String(v))}
                              formatter={(value) => [`${value}`, 'Registros']}
                            />
                            <Area type="monotone" dataKey="total" stroke="oklch(0.45 0.18 145)" fill="url(#areaGrad)" strokeWidth={2.5} dot={{ r: 3, fill: 'oklch(0.45 0.18 145)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Fila: Distribución estado + Top municipios */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      {/* Donut estado con número central */}
                      <Card className="border-l-4 border-l-blue-500 bg-blue-500/5 border-border/60" style={{boxShadow: 'var(--shadow-sm)'}}>
                        <CardHeader className="pb-1 pt-4 px-5">
                          <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                            Distribución por Estado
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-3">
                          {estadosChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                              <PieChart>
                                <Pie data={estadosChartData} cx="50%" cy="46%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value" strokeWidth={0}>
                                  {estadosChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                  <text x="50%" y="43%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 28, fontWeight: 700, fill: 'var(--foreground)' }}>
                                    {estadosChartData.reduce((a, b) => a + b.value, 0)}
                                  </text>
                                  <text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fill: 'var(--muted-foreground)' }}>
                                    registros
                                  </text>
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} formatter={(v) => [`${v} registros`, '']} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Sin datos</div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-cyan-500 bg-cyan-500/5 border-border/60" style={{boxShadow: 'var(--shadow-sm)'}}>
                        <CardHeader className="pb-1 pt-4 px-5">
                          <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-cyan-600" />
                            Top Municipios
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-2 pb-3">
                          {dashStats.porMunicipio.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                              <BarChart data={dashStats.porMunicipio} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                                <YAxis type="category" dataKey="municipio" tick={{ fontSize: 10 }} width={92} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} formatter={(v) => [`${v}`, 'Registros']} />
                                <Bar dataKey="total" radius={[0, 5, 5, 0]}>
                                  {dashStats.porMunicipio.map((_, i) => (
                                    <Cell key={i} fill={`oklch(${0.45 + i * 0.035} 0.18 145)`} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Sin datos</div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Fila: Género + Por asesor */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      {/* Donut género con número central */}
                      {genderData.length > 0 && (
                        <Card className="border-l-4 border-l-pink-500 bg-pink-500/5 border-border/60" style={{boxShadow: 'var(--shadow-sm)'}}>
                          <CardHeader className="pb-1 pt-4 px-5">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Users className="h-4 w-4 text-pink-500" />
                              Distribución por Género
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pb-3">
                            <ResponsiveContainer width="100%" height={220}>
                              <PieChart>
                                <Pie data={genderData} cx="50%" cy="48%" innerRadius={60} outerRadius={88} dataKey="value" strokeWidth={0} paddingAngle={3}>
                                  {genderData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                  <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 26, fontWeight: 700, fill: 'var(--foreground)' }}>
                                    {genderData.reduce((a, b) => a + b.value, 0)}
                                  </text>
                                  <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fill: 'var(--muted-foreground)' }}>
                                    productores
                                  </text>
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} formatter={(v) => [`${v}`, 'Productores']} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      )}

                      {(dashStats.porAsesor?.length ?? 0) > 0 && (
                        <Card className="border-l-4 border-l-amber-500 bg-amber-500/5 border-border/60" style={{boxShadow: 'var(--shadow-sm)'}}>
                          <CardHeader className="pb-1 pt-4 px-5">
                            <CardTitle className="text-base flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-amber-500" />
                              Visitas por Asesor
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-2 pb-3">
                            <ResponsiveContainer width="100%" height={Math.max(220, (dashStats.porAsesor?.length ?? 0) * 44)}>
                              <BarChart data={dashStats.porAsesor} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={140} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} formatter={(v) => [`${v} visitas`, '']} />
                                <Bar dataKey="total" radius={[0, 5, 5, 0]}>
                                  {(dashStats.porAsesor ?? []).map((_, i) => (
                                    <Cell key={i} fill={i % 2 === 0 ? '#f59e0b' : '#d97706'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      )}

                      {dashStats.porDepartamento.length > 1 && (
                        <Card className="border-l-4 border-l-purple-500 bg-purple-500/5 border-border/60 lg:col-span-2" style={{boxShadow: 'var(--shadow-sm)'}}>
                          <CardHeader className="pb-1 pt-4 px-5">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Map className="h-4 w-4 text-purple-500" />
                              Por Departamento
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-2 pb-3">
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={dashStats.porDepartamento} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="departamento" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} formatter={(v) => [`${v}`, 'Registros']} />
                                <Bar dataKey="total" fill="#a855f7" radius={[5, 5, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })()}</motion.div>)}

          {/* Sección Mapa de Predios */}
          {activeSection === 'mapa' && (
            <motion.div key="mapa" variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col flex-1 min-h-0 gap-3">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-semibold">Mapa de Predios</h2>
                  <p className="text-sm text-muted-foreground">
                    {adminMapMarkers.length > 0
                      ? `${adminMapMarkers.length} predio${adminMapMarkers.length !== 1 ? 's' : ''} registrado${adminMapMarkers.length !== 1 ? 's' : ''}`
                      : 'Cargando predios...'}
                  </p>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border">
                <MapViewer markers={adminMapMarkers} />
              </div>
            </motion.div>
          )}

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="flex flex-col h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 p-0 sm:max-w-none md:h-[90vh] md:max-h-[90vh] md:w-[95vw] md:max-w-[1400px] md:rounded-lg md:border">
          <DialogHeader className="shrink-0 border-b border-border/50 bg-primary/5 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Detalle de Caracterización
              </DialogTitle>
              {(selectedCaracterizacion?.radicado_oficial || selectedCaracterizacion?.radicado_local) && (
                <DialogDescription className="font-mono text-xs shrink-0">
                  {selectedCaracterizacion.radicado_oficial || selectedCaracterizacion.radicado_local}
                </DialogDescription>
              )}
            </div>
          </DialogHeader>

          {selectedCaracterizacion && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-4 p-4 md:p-6">

                {/* Fila 1: Beneficiario · Contacto · Registro */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Card className="border-l-4 border-l-primary bg-card/80 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <User className="h-4 w-4 text-primary" />
                        Información del Beneficiario
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Nombre:</span>
                        <span className="font-medium text-right">{getNombreCompleto(selectedCaracterizacion)}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Documento:</span>
                        <span className="font-medium">{selectedCaracterizacion.beneficiario?.tipo_documento} {selectedCaracterizacion.beneficiario?.numero_documento}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Edad:</span>
                        <span>{selectedCaracterizacion.beneficiario?.edad ?? 'No especificada'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Ocupación:</span>
                        <span className="text-right">{selectedCaracterizacion.beneficiario?.ocupacion_principal || 'No especificada'}</span>
                      </div>
                      {selectedCaracterizacion.beneficiario?.genero && (
                        <div className="flex justify-between gap-x-3">
                          <span className="text-muted-foreground shrink-0">Género:</span>
                          <span>{selectedCaracterizacion.beneficiario.genero}</span>
                        </div>
                      )}
                      {selectedCaracterizacion.beneficiario?.personas_a_cargo != null && (
                        <div className="flex justify-between gap-x-3">
                          <span className="text-muted-foreground shrink-0">Personas a cargo:</span>
                          <span>{selectedCaracterizacion.beneficiario.personas_a_cargo}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-blue-500 bg-card/80 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Phone className="h-4 w-4 text-blue-500" />
                        Contacto
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Teléfono:</span>
                        <span className="font-medium">{selectedCaracterizacion.beneficiario?.telefono || 'No registrado'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Correo:</span>
                        <span className="text-right break-all">{selectedCaracterizacion.beneficiario?.correo || 'No registrado'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Municipio:</span>
                        <span>{selectedCaracterizacion.predio?.municipio || 'No especificado'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Vereda:</span>
                        <span>{selectedCaracterizacion.predio?.vereda || 'No especificada'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-orange-500 bg-card/80 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-4 w-4 text-orange-500" />
                        Registro
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {/* Asesor — con selector para admin */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Asesor:</span>
                          <span className="font-medium text-right text-xs">{selectedCaracterizacion.visita?.nombre_tecnico || 'No asignado'}</span>
                        </div>
                        {isAdmin && (
                          <AsesorSelector
                            visitaId={selectedCaracterizacion.visita?.id}
                            currentAsesorNombre={selectedCaracterizacion.visita?.nombre_tecnico}
                            onChanged={() => { loadData({ page, search: searchQuery, estado: filterEstado }); setShowDetail(false) }}
                          />
                        )}
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Fecha visita:</span>
                        <span>{fmtFecha(selectedCaracterizacion.visita?.fecha_visita)}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Registrado:</span>
                        <span>{fmtFecha((selectedCaracterizacion.visita as any)?.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground shrink-0">Estado:</span>
                        <Badge variant="outline" className={getEstadoConfig(selectedCaracterizacion.estado).color}>
                          {getEstadoConfig(selectedCaracterizacion.estado).label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Evidencia fotográfica */}
                {(selectedCaracterizacion.foto_beneficiario_url ||
                  selectedCaracterizacion.foto_1_url ||
                  selectedCaracterizacion.foto_2_url ||
                  selectedCaracterizacion.foto_doc_frontal_url ||
                  selectedCaracterizacion.foto_doc_trasera_url ||
                  selectedCaracterizacion.firma_productor_url) && (
                    <Card className="border-l-4 border-l-purple-500 bg-card/80 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base"><Eye className="h-4 w-4 text-purple-500" />Evidencia Fotográfica</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-3">
                        {[
                          { url: selectedCaracterizacion.foto_beneficiario_url, label: 'Beneficiario', file: 'foto-beneficiario.jpg' },
                          { url: selectedCaracterizacion.foto_1_url, label: 'Predio 1', file: 'foto-predio-1.jpg' },
                          { url: selectedCaracterizacion.foto_2_url, label: 'Predio 2', file: 'foto-predio-2.jpg' },
                          { url: selectedCaracterizacion.foto_doc_frontal_url, label: 'Doc. Frontal', file: 'documento-frontal.jpg' },
                          { url: selectedCaracterizacion.foto_doc_trasera_url, label: 'Doc. Trasero', file: 'documento-trasero.jpg' },
                        ].filter(p => p.url).map(({ url, label, file }) => (
                          <div key={file} className="flex flex-col items-center gap-1">
                            <div className="relative group">
                              <img src={url!} alt={label} className="h-28 w-28 rounded-md object-cover border" />
                              <button
                                onClick={() => downloadImage(url!, file)}
                                title={`Descargar ${label}`}
                                className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <span className="text-xs text-muted-foreground">{label}</span>
                          </div>
                        ))}
                        {selectedCaracterizacion.firma_productor_url && (
                          <div className="flex flex-col items-center gap-1">
                            <div className="relative group">
                              <img src={selectedCaracterizacion.firma_productor_url} alt="Firma" className="h-28 w-auto max-w-[200px] rounded-md border bg-white object-contain p-1" />
                              <button
                                onClick={() => downloadImage(selectedCaracterizacion.firma_productor_url!, 'firma-productor.png')}
                                title="Descargar Firma"
                                className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <span className="text-xs text-muted-foreground">Firma</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                {/* Fila 2: Predio + Características */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card className="border-l-4 border-l-green-500 bg-card/80 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4 text-green-600" />
                        Datos del Predio
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Nombre:</span>
                        <span className="font-medium">{selectedCaracterizacion.predio?.nombre_predio || 'Sin nombre'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Área total:</span>
                        <span>{selectedCaracterizacion.predio?.area_total_hectareas ? `${selectedCaracterizacion.predio.area_total_hectareas} ha` : 'No registrada'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Área productiva:</span>
                        <span>{selectedCaracterizacion.predio?.area_productiva_hectareas ? `${selectedCaracterizacion.predio.area_productiva_hectareas} ha` : 'No registrada'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Tenencia:</span>
                        <span>{selectedCaracterizacion.predio?.tipo_tenencia || 'No especificada'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Altitud:</span>
                        <span>{selectedCaracterizacion.predio?.altitud_msnm ? `${selectedCaracterizacion.predio.altitud_msnm} msnm` : 'No registrada'}</span>
                      </div>
                      {selectedCaracterizacion.predio?.latitud && selectedCaracterizacion.predio?.longitud && (
                        <div className="flex justify-between gap-x-3">
                          <span className="text-muted-foreground shrink-0">Coordenadas:</span>
                          <span className="font-mono text-xs">
                            {Number(selectedCaracterizacion.predio.latitud).toFixed(5)}, {Number(selectedCaracterizacion.predio.longitud).toFixed(5)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Cultivos:</span>
                        <span className="text-right">{selectedCaracterizacion.predio?.cultivos_existentes || 'No especificados'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-blue-500 bg-card/80 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Mountain className="h-4 w-4 text-blue-500" />
                        Características del Predio
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Topografía:</span>
                        <span>{selectedCaracterizacion.caracterizacion_predio?.topografia || 'No especificada'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Ruta de acceso:</span>
                        <span className="text-right">{(selectedCaracterizacion.predio as any)?.acceso_vial || selectedCaracterizacion.caracterizacion_predio?.ruta_acceso || 'No especificada'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Distancia:</span>
                        <span>{(selectedCaracterizacion.predio as any)?.distancia_cabecera ? `${(selectedCaracterizacion.predio as any).distancia_cabecera} km` : selectedCaracterizacion.caracterizacion_predio?.distancia_km ? `${selectedCaracterizacion.caracterizacion_predio.distancia_km} km` : 'No registrada'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Temperatura:</span>
                        <span>{selectedCaracterizacion.caracterizacion_predio?.temperatura_celsius ? `${selectedCaracterizacion.caracterizacion_predio.temperatura_celsius} °C` : 'No registrada'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Vive en predio:</span>
                        <span>{selectedCaracterizacion.predio?.vive_en_predio || 'No especificado'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Fila 3: Producción + Financiero */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sprout className="h-4 w-4 text-primary" />
                        Área Productiva
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Sistema productivo:</span>
                        <span className="font-medium text-right">{selectedCaracterizacion.area_productiva?.sistema_productivo || 'No registrado'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Estado del cultivo:</span>
                        <span>{selectedCaracterizacion.area_productiva?.estado_cultivo || 'No especificado'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Producción estimada:</span>
                        <span>{(selectedCaracterizacion.area_productiva as any)?.produccion_estimada ? `${(selectedCaracterizacion.area_productiva as any).produccion_estimada} kg` : 'No especificada'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Dónde comercializa:</span>
                        <span className="text-right">{selectedCaracterizacion.area_productiva?.donde_comercializa || 'No especificado'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Ingreso mensual:</span>
                        <span>{selectedCaracterizacion.area_productiva?.ingreso_mensual_ventas ? `$${Number(selectedCaracterizacion.area_productiva.ingreso_mensual_ventas).toLocaleString('es-CO')}` : 'No registrado'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-yellow-500 bg-card/80 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Wallet className="h-4 w-4 text-yellow-500" />
                        Información Financiera
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Ingresos agropecuarios/mes:</span>
                        <span>{selectedCaracterizacion.informacion_financiera?.ingresos_mensuales_agropecuaria ? `$${Number(selectedCaracterizacion.informacion_financiera.ingresos_mensuales_agropecuaria).toLocaleString('es-CO')}` : 'No registrado'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Otros ingresos/mes:</span>
                        <span>{selectedCaracterizacion.informacion_financiera?.ingresos_mensuales_otros ? `$${Number(selectedCaracterizacion.informacion_financiera.ingresos_mensuales_otros).toLocaleString('es-CO')}` : 'No registrado'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Egresos/mes:</span>
                        <span>{selectedCaracterizacion.informacion_financiera?.egresos_mensuales ? `$${Number(selectedCaracterizacion.informacion_financiera.egresos_mensuales).toLocaleString('es-CO')}` : 'No registrado'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Activos totales:</span>
                        <span>{selectedCaracterizacion.informacion_financiera?.activos_totales ? `$${Number(selectedCaracterizacion.informacion_financiera.activos_totales).toLocaleString('es-CO')}` : 'No registrado'}</span>
                      </div>
                      <div className="flex justify-between gap-x-3">
                        <span className="text-muted-foreground shrink-0">Pasivos totales:</span>
                        <span>{selectedCaracterizacion.informacion_financiera?.pasivos_totales ? `$${Number(selectedCaracterizacion.informacion_financiera.pasivos_totales).toLocaleString('es-CO')}` : 'No registrado'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Acciones */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Editar formulario */}
                  {(isAdmin || (currentProfile?.rol === 'asesor' && (!selectedCaracterizacion.visita?.asesor_id || selectedCaracterizacion.visita?.asesor_id === currentUser?.id))) && selectedCaracterizacion.visita?.id && (
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <PenTool className="h-4 w-4 text-primary" />
                          Editar Formulario
                        </CardTitle>
                        <CardDescription>Modifica los datos del registro directamente en el formulario</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button asChild className="gap-2">
                          <Link href={`/formulario/editar/${selectedCaracterizacion.visita.id}`}>
                            <PenTool className="h-4 w-4" />
                            Abrir Editor
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Exportar PDF */}
                  <Card className="border-l-4 border-l-cyan-500 bg-card/80 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base"><Printer className="h-4 w-4 text-cyan-500" />Exportar Ficha</CardTitle>
                      <CardDescription>Genera una ficha PDF con todos los datos del registro</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="gap-2" onClick={() => generatePDF(selectedCaracterizacion)}>
                        <Printer className="h-4 w-4" />
                        Generar PDF / Imprimir
                      </Button>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Se abrirá una ventana con la ficha completa lista para imprimir o guardar como PDF.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Asignar Asesor */}
                  {isAdmin && !selectedCaracterizacion.visita?.asesor_id && (
                    <Card className="border-blue-500/20 bg-blue-500/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <UserCheck className="h-4 w-4 text-blue-500" />
                          Asignar Asesor
                        </CardTitle>
                        <CardDescription>
                          Este registro fue enviado sin asesor asignado. Asígnalo a un asesor o admin.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Select value={selectedNewAsesorId} onValueChange={setSelectedNewAsesorId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Seleccionar asesor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {asesoresDisponibles.map(a => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.nombre_completo || a.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          disabled={!selectedNewAsesorId || isAssigningAsesor}
                          onClick={() => assignAsesor(selectedCaracterizacion.visita!.id, selectedNewAsesorId)}
                          className="gap-2 shrink-0"
                        >
                          {isAssigningAsesor ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                          Asignar
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Ver en Mapa */}
                  {selectedCaracterizacion.predio?.latitud && selectedCaracterizacion.predio?.longitud && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Ver en Mapa</CardTitle>
                        <CardDescription>Analice la ubicación con capas NDVI, satelital y clima</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={() => { setShowDetail(false); setTimeout(() => openMapView(selectedCaracterizacion), 100) }}
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

                {/* Credenciales de acceso del beneficiario */}
                {(isAdmin || currentProfile?.rol === 'asesor') && (() => {
                  const tieneCorreo = !!selectedCaracterizacion.beneficiario?.correo
                  const handleEnviarCredenciales = async () => {
                    if (!credencialesEmail.trim()) return
                    setIsSendingCredenciales(true)
                    setCredencialesResult(null)
                    try {
                      const res = await fetch('/api/admin/enviar-credenciales', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          correo: credencialesEmail.trim(),
                          nombreCompleto: getNombreCompleto(selectedCaracterizacion),
                          beneficiarioId: selectedCaracterizacion.beneficiario?.id,
                        }),
                      })
                      const data = await res.json()
                      if (!res.ok) { toast.error(data.error || 'Error enviando credenciales'); return }
                      setCredencialesResult({ credenciales: data.credenciales, emailEnviado: data.emailEnviado })
                      // Actualizar el correo en el objeto local si cambió
                      if (!tieneCorreo) {
                        setSelectedCaracterizacion(prev =>
                          prev ? { ...prev, beneficiario: prev.beneficiario ? { ...prev.beneficiario, correo: credencialesEmail.trim() } : prev.beneficiario } : prev
                        )
                      }
                      toast.success(data.emailEnviado ? 'Credenciales enviadas por correo' : 'Credenciales generadas')
                    } catch {
                      toast.error('Error al enviar credenciales')
                    } finally {
                      setIsSendingCredenciales(false)
                    }
                  }
                  return (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Mail className="h-4 w-4 text-primary" />
                          Acceso del Beneficiario
                        </CardTitle>
                        <CardDescription>
                          {tieneCorreo ? 'Reenvía credenciales si el beneficiario olvidó su contraseña' : 'El beneficiario no tiene correo registrado. Agrega uno para crear su acceso'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {!credencialesResult ? (
                          <>
                            <div className="flex gap-2">
                              <input
                                type="email"
                                value={credencialesEmail}
                                onChange={e => setCredencialesEmail(e.target.value)}
                                placeholder="correo@ejemplo.com"
                                readOnly={tieneCorreo}
                                className={`h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tieneCorreo ? 'opacity-70 cursor-default' : ''}`}
                              />
                              <Button
                                size="sm"
                                className="gap-2 shrink-0"
                                disabled={isSendingCredenciales || !credencialesEmail.trim()}
                                onClick={handleEnviarCredenciales}
                              >
                                {isSendingCredenciales ? (
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                                {tieneCorreo ? 'Reenviar' : 'Crear y enviar'}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">
                              {credencialesResult.emailEnviado ? '✓ Credenciales enviadas por correo' : '✓ Credenciales generadas'}
                            </p>
                            <div className="space-y-1 text-sm">
                              <p><span className="text-muted-foreground">Correo:</span> <code className="rounded bg-background px-1">{credencialesResult.credenciales.email}</code></p>
                              <p className="flex items-center gap-2">
                                <span className="text-muted-foreground">Contraseña:</span>
                                <code className="rounded bg-background px-1 font-bold">{credencialesResult.credenciales.password}</code>
                                <button
                                  className="text-xs text-primary underline-offset-2 hover:underline"
                                  onClick={() => navigator.clipboard.writeText(credencialesResult!.credenciales.password)}
                                >copiar</button>
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setCredencialesResult(null)}>
                              Enviar de nuevo
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })()}

                {/* Cambiar Estado */}
                <Card className="border-l-4 border-l-primary bg-primary/5 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4 text-primary" />Cambiar Estado</CardTitle>
                    <CardDescription>Actualice el estado de la caracterización</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {(["REVISADO", "EN_ESTUDIO_CREDITO", "APROBADO", "CANCELADO"] as const)
                        .filter(est => {
                          const rol = currentProfile?.rol
                          if (rol === 'admin') return true
                          if (rol === 'asesor') return ['REVISADO'].includes(est)
                          if (rol === 'analista') return ['EN_ESTUDIO_CREDITO', 'APROBADO', 'CANCELADO'].includes(est)
                          return false
                        })
                        .map((est) => {
                          const cfg = estadoConfig[est.toLowerCase() as EstadoKey] || estadoConfig.pendiente
                          const EstIcon = cfg.icon
                          const currentEstado = (selectedCaracterizacion.estado || '').toUpperCase()
                          const isCurrent = currentEstado === est
                          return (
                            <Button
                              key={est}
                              variant={isCurrent ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleUpdateEstado(selectedCaracterizacion.id, est)}
                              disabled={isUpdating || isCurrent}
                              className={`gap-2 ${est === 'APROBADO' && !isCurrent ? 'hover:bg-green-600 hover:text-white' : ''} ${est === 'CANCELADO' && !isCurrent ? 'hover:bg-red-600 hover:text-white' : ''}`}
                            >
                              <EstIcon className="h-4 w-4" />
                              {cfg.label}
                            </Button>
                          )
                        })}
                    </div>
                  </CardContent>
                </Card>

                {/* Observaciones */}
                <Card className="border-l-4 border-l-slate-400 bg-card/80 border-border/60" style={{boxShadow:'var(--shadow-sm)'}}>
                  <CardHeader>
                    <CardTitle className="text-base">Observaciones</CardTitle>
                    <CardDescription>Agregue notas o comentarios sobre la caracterización</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="Escriba sus observaciones aquí..."
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
                          await loadData({ page: 1, search: searchQuery, estado: filterEstado })
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

              </div>
            </div>
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
                polygonCoords={selectedCaracterizacion.predio.poligono ?? undefined}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar eliminación de usuario */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => { if (!open) setUserToDelete(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Eliminar cuenta
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Se eliminará permanentemente la cuenta de{' '}
                  <strong className="text-foreground">{userToDelete?.nombre}</strong>.
                </p>
                {userToDelete?.rol === 'asesor' && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
                    <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
                    <span>
                      Las caracterizaciones asignadas a este asesor se <strong>reasignarán automáticamente</strong> al asesor con menor carga de trabajo actualmente.
                    </span>
                  </div>
                )}
                <p className="text-xs">Esta acción es irreversible.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setUserToDelete(null)} disabled={isDeletingUser}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={deleteUser}
              disabled={isDeletingUser}
              className="gap-2"
            >
              {isDeletingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar definitivamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog confirmar eliminación de caracterización */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !isDeleting) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Eliminar caracterización
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Esta acción es <strong>irreversible</strong>. Se eliminará permanentemente la caracterización de{' '}
                  <strong className="text-foreground">
                    {deleteTarget ? `${deleteTarget.beneficiario?.nombres ?? ''} ${deleteTarget.beneficiario?.apellidos ?? ''}`.trim() || 'este beneficiario' : ''}
                  </strong>{' '}
                  junto con toda la información asociada:
                </p>
                <ul className="ml-4 list-disc space-y-0.5">
                  <li>Datos del beneficiario e información financiera</li>
                  <li>Datos del predio y área productiva</li>
                  <li>Fotos, firma y documentos adjuntos</li>
                  <li>Visita técnica (si no tiene otros registros)</li>
                </ul>
                <p className="font-medium text-foreground">
                  El asesor vinculado NO será eliminado.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCaracterizacion}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
