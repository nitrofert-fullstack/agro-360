"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
  UserX,
  UserCheck,
  Mail,
  Shield,
  Download,
  Printer,
  PenTool,
} from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useVirtualizer } from "@tanstack/react-virtual"

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
    nombres: string
    apellidos: string
    tipo_documento: string
    numero_documento: string
    telefono: string | null
    correo: string | null
    edad: number | null
    ocupacion_principal: string | null
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
    radicado_local: string | null
    radicado_oficial: string | null
    estado: string | null
    asesor_id: string | null
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

type EstadoKey =
  | "pendiente" | "pendiente_sincronizacion" | "sincronizado" | "aprobado" | "rechazado"
  | "en_revision" | "error_sincronizacion"
  | "iniciado" | "revisado" | "en_estudio_credito" | "cancelado"

const estadoConfig: Record<EstadoKey, { label: string; color: string; icon: typeof Clock }> = {
  // Nuevos estados BD
  iniciado: { label: "Iniciado", color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: Clock },
  revisado: { label: "En Revisión", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Eye },
  en_estudio_credito: { label: "En Estudio", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Eye },
  aprobado: { label: "Aprobado", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle },
  cancelado: { label: "Cancelado", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
  // Legado
  pendiente: { label: "Pendiente", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock },
  pendiente_sincronizacion: { label: "Pend. Sync", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock },
  sincronizado: { label: "Sincronizado", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Eye },
  en_revision: { label: "En Revisión", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Eye },
  rechazado: { label: "Rechazado", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
  error_sincronizacion: { label: "Error", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
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

export function AdminDashboard() {
  const { isAdmin, user: currentUser, profile: currentProfile } = useAuth()
  const isAnalista = currentProfile?.rol === 'analista'
  const [caracterizaciones, setCaracterizaciones] = useState<CaracterizacionDB[]>([])
  const [estadisticas, setEstadisticas] = useState({ total: 0, pendientes: 0, sincronizados: 0, aprobados: 0, rechazados: 0 })
  const [selectedCaracterizacion, setSelectedCaracterizacion] = useState<CaracterizacionDB | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showMap, setShowMap] = useState(false)
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
  const [activeSection, setActiveSection] = useState<"caracterizaciones" | "usuarios">("caracterizaciones")
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
  // Búsqueda y paginación de usuarios
  const [userSearch, setUserSearch] = useState("")
  const [userPage, setUserPage] = useState(1)
  const USERS_PER_PAGE = 10

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
          pendientes: items.filter(c => ['pendiente', 'pendiente_sincronizacion', 'iniciado'].includes((c.visita?.estado || c.estado || '').toLowerCase())).length,
          sincronizados: items.filter(c => ['sincronizado', 'revisado'].includes((c.visita?.estado || c.estado || '').toLowerCase())).length,
          aprobados: items.filter(c => (c.visita?.estado || c.estado || '').toLowerCase() === 'aprobado').length,
          rechazados: items.filter(c => ['rechazado', 'cancelado'].includes((c.visita?.estado || c.estado || '').toLowerCase())).length,
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

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true)
    try {
      // Cargar perfiles de usuarios
      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesErr) throw profilesErr
      setUsuarios((profiles || []) as UserProfile[])

      // Cargar invitaciones
      const { data: invs, error: invsErr } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false })

      if (!invsErr) {
        setInvitations((invs || []) as Invitation[])
      }
    } catch (err) {
      console.error('Error loading users:', err)
      toast.error('Error al cargar usuarios')
    } finally {
      setIsLoadingUsers(false)
    }
  }, [supabase])

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
      await loadUsers()
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
      await loadUsers()
    } catch (err) {
      console.error('Error creating invitation:', err)
      toast.error('Error al crear el usuario')
    } finally {
      setIsCreatingInvite(false)
    }
  }

  const loadAsesores = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, nombre_completo')
        .in('rol', ['asesor', 'admin'])
        .eq('activo', true)
        .order('nombre_completo')
      setAsesoresDisponibles((data || []) as { id: string; nombre_completo: string }[])
    } catch {
      // No crítico
    }
  }, [supabase])

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
      await loadUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar rol')
    } finally {
      setChangingRoleUserId(null)
    }
  }

  useEffect(() => {
    loadData({ page: 1, search: '', estado: 'todos', append: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeSection === 'usuarios') {
      loadUsers()
    }
  }, [activeSection, loadUsers])

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
      // Recargar datos — el estado actualizado vendrá del servidor (visitas.estado)
      await loadData({ page: 1, search: searchQuery, estado: filterEstado, append: false })
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
    if (isAdmin && asesoresDisponibles.length === 0) loadAsesores()
  }

  const openMapView = (c: CaracterizacionDB) => {
    setSelectedCaracterizacion(c)
    setShowMap(true)
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
      'Edad', 'Telefono', 'Correo', 'Ocupacion Principal',
      // Predio
      'Nombre Predio', 'Departamento', 'Municipio', 'Vereda', 'Direccion',
      'Tipo Tenencia', 'Codigo Catastral', 'Area Total (Ha)', 'Area Cultivada (Ha)',
      'Latitud', 'Longitud', 'Altitud (msnm)',
      'Vive en Predio', 'Tiene Vivienda', 'Cultivos Existentes',
      // Caracterizacion predio
      'Topografia', 'Tipo Suelo', 'Cobertura Vegetal', 'Ruta Acceso',
      'Distancia Cabecera (km)', 'Tiempo Acceso', 'Temperatura (C)', 'Meses Lluvia',
      // Agua
      'Fuente Agua',
      // Area productiva
      'Cultivo Principal', 'Area Cultivo (Ha)', 'Produccion Estimada', 'Estado Cultivo',
      'Destino Produccion', 'Sistema Productivo', 'Caracterizacion Cultivo',
      'Donde Comercializa', 'Ingreso Mensual Ventas',
      // Financiero
      'Ingresos Agropecuarios', 'Ingresos Otros', 'Egresos Mensuales',
      'Activos Totales', 'Pasivos Totales', 'Acceso Credito',
      // Autorizaciones
      'Autoriza Datos Personales',
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
      c.beneficiario?.telefono || '',
      c.beneficiario?.correo || '',
      c.beneficiario?.ocupacion_principal || '',
      c.predio?.nombre_predio || '',
      c.predio?.departamento || '',
      c.predio?.municipio || '',
      c.predio?.vereda || '',
      c.predio?.acceso_vial || '',
      c.predio?.tipo_tenencia || '',
      c.predio?.codigo_catastral || '',
      c.predio?.area_total ?? '',
      c.predio?.area_cultivada ?? '',
      c.predio?.latitud ?? '',
      c.predio?.longitud ?? '',
      c.predio?.altitud ?? '',
      bool(c.predio?.vive_en_predio),
      bool(c.predio?.tiene_vivienda),
      c.predio?.cultivos_existentes || '',
      c.caracterizacion_predio?.topografia || '',
      c.caracterizacion_predio?.tipo_suelo || '',
      c.caracterizacion_predio?.cobertura_vegetal || '',
      c.caracterizacion_predio?.ruta_acceso || '',
      c.caracterizacion_predio?.distancia_km ?? '',
      c.caracterizacion_predio?.tiempo_acceso || '',
      c.caracterizacion_predio?.temperatura_celsius ?? '',
      c.caracterizacion_predio?.meses_lluvia || '',
      c.predio?.fuente_agua || '',
      c.area_productiva?.cultivo_principal || '',
      c.area_productiva?.area_cultivo_principal ?? '',
      c.area_productiva?.produccion_estimada ?? '',
      c.area_productiva?.estado_cultivo || '',
      c.area_productiva?.destino_produccion || '',
      c.area_productiva?.sistema_produccion || '',
      c.area_productiva?.caracterizacion_cultivo || '',
      c.area_productiva?.donde_comercializa || '',
      money(c.area_productiva?.ingreso_mensual_ventas),
      money(c.informacion_financiera?.ingresos_mensuales_agropecuaria),
      money(c.informacion_financiera?.ingresos_mensuales_otros),
      money(c.informacion_financiera?.egresos_mensuales),
      money(c.informacion_financiera?.activos_totales),
      money(c.informacion_financiera?.pasivos_totales),
      bool(c.informacion_financiera?.acceso_credito),
      bool(c.autoriza_tratamiento_datos),
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

  const generatePDF = (c: CaracterizacionDB) => {
    const nombre = getNombreCompleto(c)
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
      <div class="logo">Agro360</div>
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
      ${field('Area total', c.predio?.area_total ? `${c.predio.area_total} ha` : null)}
      ${field('Area cultivada', c.predio?.area_cultivada ? `${c.predio.area_cultivada} ha` : null)}
      ${field('Altitud', c.predio?.altitud ? `${c.predio.altitud} msnm` : null)}
      ${field('Coordenadas', c.predio?.latitud && c.predio?.longitud ? `${c.predio.latitud.toFixed(5)}, ${c.predio.longitud.toFixed(5)}` : null)}
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
      ${field('Cobertura vegetal', c.caracterizacion_predio.cobertura_vegetal)}
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
      ${field('Sistema productivo', c.area_productiva.sistema_produccion)}
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
      ${field('Acceso credito', c.informacion_financiera.acceso_credito ? 'Si' : (c.informacion_financiera.acceso_credito === false ? 'No' : null))}
    </div>
  </div>` : ''}

  <!-- Registro -->
  <h2>Datos del Registro</h2>
  <div class="section-box">
    <div class="grid3">
      ${field('Tecnico / Asesor', c.visita?.nombre_tecnico || c.asesor?.nombre_completo)}
      ${field('Correo asesor', c.asesor?.email)}
      ${field('Fecha visita', c.visita?.fecha_visita ? new Date(c.visita.fecha_visita).toLocaleDateString('es-CO') : null)}
      ${field('Fecha registro', c.created_at ? new Date(c.created_at).toLocaleDateString('es-CO') : null)}
      ${field('Radicado local', c.radicado_local)}
      ${field('Radicado oficial', c.radicado_oficial)}
    </div>
  </div>

  <!-- Autorizaciones -->
  <h2>Autorizaciones</h2>
  <div class="section-box">
    <div class="auth-row">
      <span class="auth-item ${c.autoriza_tratamiento_datos ? 'auth-ok' : 'auth-no'}">
        ${c.autoriza_tratamiento_datos ? '✓' : '✗'} Tratamiento de datos personales
      </span>
    </div>
    ${c.observaciones ? `<div style="margin-top:8px">${field('Observaciones', c.observaciones)}</div>` : ''}
  </div>

  <div class="footer">
    <span>Agro360 — Sistema de Caracterizacion Agropecuaria</span>
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

  const filteredUsuarios = usuarios.filter(u => {
    if (!userSearch.trim()) return true
    const q = userSearch.toLowerCase()
    return (
      (u.nombre_completo || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    )
  })
  const userTotalPages = Math.max(1, Math.ceil(filteredUsuarios.length / USERS_PER_PAGE))
  const paginatedUsuarios = filteredUsuarios.slice(
    (userPage - 1) * USERS_PER_PAGE,
    userPage * USERS_PER_PAGE
  )

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
              <h1 className="text-lg font-bold text-foreground md:text-xl">Agro360</h1>
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
            <Button variant="outline" size="sm" onClick={() => { loadData({ page: 1, search: searchQuery, estado: filterEstado }); if (activeSection === 'usuarios') loadUsers(); toast.info('Actualizando datos...') }} className="h-9 gap-2 bg-transparent px-2 md:px-3">
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
                      <p className="text-2xl font-bold">{totalCount || estadisticas.total}</p>
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

            {/* Section navigation */}
            <div className="mt-6 space-y-2">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <LayoutDashboard className="h-4 w-4" />
                Secciones
              </div>
              <Button
                variant={activeSection === 'caracterizaciones' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setActiveSection('caracterizaciones')}
              >
                <FileText className="h-4 w-4" />
                Caracterizaciones
              </Button>
              {!isAnalista && (
                <Button
                  variant={activeSection === 'usuarios' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => setActiveSection('usuarios')}
                >
                  <Users className="h-4 w-4" />
                  Usuarios
                </Button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-3 md:p-6">
          {/* Mobile section tabs */}
          <div className="mb-4 flex gap-2 lg:hidden">
            <Button
              variant={activeSection === 'caracterizaciones' ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => setActiveSection('caracterizaciones')}
            >
              <FileText className="h-4 w-4" />
              Caracterizaciones
            </Button>
            {!isAnalista && (
              <Button
                variant={activeSection === 'usuarios' ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => setActiveSection('usuarios')}
              >
                <Users className="h-4 w-4" />
                Usuarios
              </Button>
            )}
          </div>

          {activeSection === 'caracterizaciones' && (
          <>
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar nombre, predio, municipio..."
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
                  <SelectItem value="APROBADO">Aprobado</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
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
              style={{ height: 'calc(100vh - 310px)', overflowY: 'auto' }}
              className="rounded-md"
            >
              <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const c = caracterizaciones[virtualRow.index]
                  if (!c) return null
                  const config = getEstadoConfig(c.visita?.estado || c.estado)
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
                      <Card className="transition-colors hover:bg-muted/30">
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
                                  {new Date(c.created_at).toLocaleDateString()}
                                </span>
                                {!c.visita?.asesor_id && (
                                  <span className="flex items-center gap-1 text-blue-500">
                                    <User className="h-3 w-3 shrink-0" />
                                    Sin asesor
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                              {c.predio?.latitud && c.predio?.longitud && (
                                <Button variant="outline" size="sm" onClick={() => openMapView(c)} className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:gap-1 sm:px-3">
                                  <Map className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline text-xs">Mapa</span>
                                </Button>
                              )}
                              <Button variant="default" size="sm" onClick={() => openDetail(c)} className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:gap-1 sm:px-3">
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline text-xs">Ver</span>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="mt-3 flex justify-center">
                <Button variant="outline" onClick={loadMore} disabled={isLoadingMore} className="gap-2">
                  {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isLoadingMore ? 'Cargando...' : `Cargar más (${totalCount - caracterizaciones.length} restantes)`}
                </Button>
              </div>
            )}
            {isLoadingMore && !hasMore && (
              <div className="mt-3 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            </>
          )}
          </>
          )}

          {/* Seccion Usuarios */}
          {activeSection === 'usuarios' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Gestion de Usuarios</h2>
                  <p className="text-sm text-muted-foreground">Administra las cuentas de asesores y sus permisos de acceso</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadUsers} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Actualizar</span>
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
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Mail className="h-4 w-4 text-primary" />
                      Crear Usuario
                    </CardTitle>
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
                          <SelectItem value="campesino">Beneficiario / Campesino</SelectItem>
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
              {!isLoadingUsers && usuarios.length > 0 && (
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o email..."
                    value={userSearch}
                    onChange={e => { setUserSearch(e.target.value); setUserPage(1) }}
                    className="pl-9"
                  />
                </div>
              )}

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
              ) : filteredUsuarios.length === 0 ? (
                <Card className="py-8 text-center">
                  <CardContent>
                    <p className="text-sm text-muted-foreground">No se encontraron usuarios con "{userSearch}"</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {paginatedUsuarios.map((u) => {
                    const invitation = getInvitationForEmail(u.email)
                    return (
                      <Card key={u.id} className={`transition-colors ${!u.activo ? 'opacity-60 border-red-500/20' : ''}`}>
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${u.activo ? 'bg-primary/10' : 'bg-red-500/10'}`}>
                            {u.activo ? (
                              <User className="h-6 w-6 text-primary" />
                            ) : (
                              <UserX className="h-6 w-6 text-red-500" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-medium">{u.nombre_completo || 'Sin nombre'}</h3>
                              <Badge variant="outline" className={
                                u.rol === 'admin'    ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                u.rol === 'analista' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                                u.rol === 'campesino'? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                                       'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              }>
                                {u.rol === 'admin'     ? <><Shield className="mr-1 h-3 w-3" />Admin</> :
                                 u.rol === 'analista'  ? <><Eye className="mr-1 h-3 w-3" />Analista</> :
                                 u.rol === 'campesino' ? <><Sprout className="mr-1 h-3 w-3" />Agricultor</> :
                                                         <><User className="mr-1 h-3 w-3" />Asesor</>}
                              </Badge>
                              {invitation && (
                                <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                                  <CheckCircle className="h-3 w-3" />
                                  {invitation.usado ? 'Accedió' : 'Cred. enviadas'}
                                </Badge>
                              )}
                              {!u.activo && (
                                <Badge variant="destructive" className="gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Inhabilitado
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {u.email}
                              </span>
                              {u.telefono && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {u.telefono}
                                </span>
                              )}
                              {u.created_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Registrado: {new Date(u.created_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
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
                                  <SelectTrigger className="h-8 w-32 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                    <SelectItem value="asesor">Asesor</SelectItem>
                                    <SelectItem value="analista">Analista</SelectItem>
                                    <SelectItem value="campesino">Agricultor</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            {u.rol !== 'admin' && (
                              <Button
                                variant={u.activo ? "outline" : "default"}
                                size="sm"
                                onClick={() => toggleUserActive(u.id, u.activo)}
                                className={`gap-1.5 ${u.activo ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-950' : 'bg-green-600 hover:bg-green-700'}`}
                              >
                                {u.activo ? (
                                  <>
                                    <UserX className="h-4 w-4" />
                                    <span className="hidden sm:inline">Inhabilitar</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4" />
                                    <span className="hidden sm:inline">Habilitar</span>
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                  {/* Paginación usuarios */}
                  {userTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <p className="text-sm text-muted-foreground">
                        {filteredUsuarios.length} usuario{filteredUsuarios.length !== 1 ? 's' : ''} · Pág. {userPage} de {userTotalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={userPage === 1}
                          onClick={() => setUserPage(p => p - 1)}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={userPage === userTotalPages}
                          onClick={() => setUserPage(p => p + 1)}
                        >
                          Siguiente
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
          )}
        </main>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-h-[95dvh] w-[calc(100vw-16px)] max-w-5xl overflow-hidden p-0 sm:w-full sm:max-h-[90vh]">
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
              <div className="overflow-x-auto border-b border-border">
                <TabsList className="inline-flex w-auto min-w-full justify-start rounded-none bg-transparent px-3 sm:px-6">
                  <TabsTrigger value="general" className="gap-1.5 text-xs sm:gap-2 sm:text-sm">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="predio" className="gap-1.5 text-xs sm:gap-2 sm:text-sm">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Predio
                  </TabsTrigger>
                  <TabsTrigger value="produccion" className="gap-1.5 text-xs sm:gap-2 sm:text-sm">
                    <Sprout className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Produccion
                  </TabsTrigger>
                  <TabsTrigger value="acciones" className="gap-1.5 text-xs sm:gap-2 sm:text-sm">
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Acciones
                  </TabsTrigger>
                </TabsList>
              </div>

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
                      <CardContent className="space-y-2 text-sm [&>div>span:last-child]:min-w-0 [&>div>span:last-child]:break-words [&>div>span:last-child]:text-right">
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Nombre:</span>
                          <span className="font-medium">{getNombreCompleto(selectedCaracterizacion)}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Documento:</span>
                          <span className="font-medium">{selectedCaracterizacion.beneficiario?.tipo_documento} {selectedCaracterizacion.beneficiario?.numero_documento}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Edad:</span>
                          <span>{selectedCaracterizacion.beneficiario?.edad || 'No especificada'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
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
                      <CardContent className="space-y-2 text-sm [&>div>span:last-child]:min-w-0 [&>div>span:last-child]:break-words [&>div>span:last-child]:text-right">
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Telefono:</span>
                          <span className="font-medium">{selectedCaracterizacion.beneficiario?.telefono || 'No registrado'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Correo:</span>
                          <span>{selectedCaracterizacion.beneficiario?.correo || 'No registrado'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Municipio:</span>
                          <span>{selectedCaracterizacion.predio?.municipio || 'No especificado'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
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
                      <CardContent className="space-y-2 text-sm [&>div>span:last-child]:min-w-0 [&>div>span:last-child]:break-words [&>div>span:last-child]:text-right">
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Tecnico:</span>
                          <span className="font-medium">{selectedCaracterizacion.visita?.nombre_tecnico || selectedCaracterizacion.asesor?.nombre_completo || 'No registrado'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Fecha visita:</span>
                          <span>{selectedCaracterizacion.visita?.fecha_visita ? new Date(selectedCaracterizacion.visita.fecha_visita).toLocaleDateString() : 'No registrada'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
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
                      <CardContent className="space-y-2 text-sm [&>div>span:last-child]:min-w-0 [&>div>span:last-child]:break-words [&>div>span:last-child]:text-right">
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Nombre:</span>
                          <span className="font-medium">{selectedCaracterizacion.predio?.nombre_predio || 'Sin nombre'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Area Total:</span>
                          <span>{selectedCaracterizacion.predio?.area_total ? `${selectedCaracterizacion.predio.area_total} ha` : 'No registrada'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Area Cultivada:</span>
                          <span>{selectedCaracterizacion.predio?.area_cultivada ? `${selectedCaracterizacion.predio.area_cultivada} ha` : 'No registrada'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Tenencia:</span>
                          <span>{selectedCaracterizacion.predio?.tipo_tenencia || 'No especificada'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Altitud:</span>
                          <span>{selectedCaracterizacion.predio?.altitud ? `${selectedCaracterizacion.predio.altitud} msnm` : 'No registrada'}</span>
                        </div>
                        {selectedCaracterizacion.predio?.latitud && selectedCaracterizacion.predio?.longitud && (
                          <div className="flex justify-between gap-x-3 min-w-0">
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
                      <CardContent className="space-y-2 text-sm [&>div>span:last-child]:min-w-0 [&>div>span:last-child]:break-words [&>div>span:last-child]:text-right">
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Topografia:</span>
                          <span>{selectedCaracterizacion.caracterizacion_predio?.topografia || 'No especificada'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Cobertura vegetal:</span>
                          <span>{selectedCaracterizacion.caracterizacion_predio?.cobertura_vegetal || 'No especificada'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Acceso vial:</span>
                          <span>{selectedCaracterizacion.predio?.acceso_vial || selectedCaracterizacion.caracterizacion_predio?.ruta_acceso || 'No especificado'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Distancia cabecera:</span>
                          <span>{selectedCaracterizacion.predio?.distancia_cabecera ? `${selectedCaracterizacion.predio.distancia_cabecera} km` : 'No registrada'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Vive en predio:</span>
                          <span>{selectedCaracterizacion.predio?.vive_en_predio ? 'Si' : 'No'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
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
                      <CardContent className="space-y-2 text-sm [&>div>span:last-child]:min-w-0 [&>div>span:last-child]:break-words [&>div>span:last-child]:text-right">
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Cultivo principal:</span>
                          <span className="font-medium">{selectedCaracterizacion.area_productiva?.cultivo_principal || 'No registrado'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Area:</span>
                          <span>{selectedCaracterizacion.area_productiva?.area_cultivo_principal ? `${selectedCaracterizacion.area_productiva.area_cultivo_principal} ha` : 'No registrada'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Estado del cultivo:</span>
                          <span>{selectedCaracterizacion.area_productiva?.estado_cultivo || 'No especificado'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Destino produccion:</span>
                          <span>{selectedCaracterizacion.area_productiva?.destino_produccion || 'No especificado'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Donde comercializa:</span>
                          <span>{selectedCaracterizacion.area_productiva?.donde_comercializa || 'No especificado'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
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
                      <CardContent className="space-y-2 text-sm [&>div>span:last-child]:min-w-0 [&>div>span:last-child]:break-words [&>div>span:last-child]:text-right">
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Ingresos agropecuaria:</span>
                          <span>{selectedCaracterizacion.informacion_financiera?.ingresos_mensuales_agropecuaria ? `$${Number(selectedCaracterizacion.informacion_financiera.ingresos_mensuales_agropecuaria).toLocaleString()}` : 'No registrado'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Otros ingresos:</span>
                          <span>{selectedCaracterizacion.informacion_financiera?.ingresos_mensuales_otros ? `$${Number(selectedCaracterizacion.informacion_financiera.ingresos_mensuales_otros).toLocaleString()}` : 'No registrado'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Egresos:</span>
                          <span>{selectedCaracterizacion.informacion_financiera?.egresos_mensuales ? `$${Number(selectedCaracterizacion.informacion_financiera.egresos_mensuales).toLocaleString()}` : 'No registrado'}</span>
                        </div>
                        <div className="flex justify-between gap-x-3 min-w-0">
                          <span className="text-muted-foreground">Acceso credito:</span>
                          <span>{selectedCaracterizacion.informacion_financiera?.acceso_credito ? 'Si' : 'No'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="acciones" className="m-0 p-6">
                  <div className="space-y-6">

                    {/* Editar formulario — solo asesor (propio) y admin */}
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
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Exportar Ficha</CardTitle>
                        <CardDescription>Genera una ficha PDF con todos los datos del registro</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => generatePDF(selectedCaracterizacion)}
                        >
                          <Printer className="h-4 w-4" />
                          Generar PDF / Imprimir
                        </Button>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Se abrira una ventana con la ficha completa lista para imprimir o guardar como PDF.
                        </p>
                      </CardContent>
                    </Card>

                    {/* Asignar Asesor — solo admin, solo cuando el registro no tiene asesor */}
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
                            {isAssigningAsesor ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                            Asignar
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Cambiar Estado</CardTitle>
                        <CardDescription>Actualice el estado de la caracterizacion</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {(["INICIADO", "REVISADO", "EN_ESTUDIO_CREDITO", "APROBADO", "CANCELADO"] as const)
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
                            const currentEstado = (selectedCaracterizacion.visita?.estado || selectedCaracterizacion.estado || '').toUpperCase()
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
