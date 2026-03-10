"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { ConnectionStatus } from "@/components/connection-status"
import { SyncErrorDisplay } from "@/components/sync-error-display"
import { useAuth } from "@/hooks/use-auth"
import { useSync } from "@/hooks/use-sync"
import { createClient } from "@/lib/supabase/client"
import { getStats, getAllCaracterizaciones, getCaracterizacionesPendientes, type CaracterizacionLocal } from "@/lib/db/indexed-db"
import { CampesinoDashboard } from "@/components/campesino-dashboard"
import { toast } from "sonner"
import {
  FileText,
  Map,
  Plus,
  LogOut,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Upload,
} from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const { user, profile, loading, isAuthenticated, isAdmin, signOut } = useAuth()
  const isAnalista = profile?.rol === 'analista'
  const isAsesor = profile?.rol === 'asesor'
  const isCampesino = profile?.rol === 'campesino'
  const { syncAll, isSyncing, canSync } = useSync()
  const syncedRef = useRef(false)
  const statsLoadedRef = useRef(false)
  const [stats, setStats] = useState({ total: 0, pendientes: 0, sincronizados: 0, errores: 0 })
  const [serverStats, setServerStats] = useState<{ total: number; registros: any[] } | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [recentSearch, setRecentSearch] = useState("")
  const [recentPage, setRecentPage] = useState(1)
  const [localQueue, setLocalQueue] = useState<CaracterizacionLocal[]>([])
  const RECENT_PER_PAGE = 5

  // Routing por rol — admin y analista van directo a su panel
  useEffect(() => {
    if (loading) return
    if (!isAuthenticated) {
      router.replace('/auth/login')
      return
    }
    if (isAdmin || isAnalista) {
      router.replace('/admin/estadisticas')
      return
    }
    // Solo cargar stats para asesor y campesino
    if (!statsLoadedRef.current) {
      statsLoadedRef.current = true
      if (isAsesor) loadAsesorStats()
    }
  }, [loading, isAuthenticated, isAdmin, isAnalista, isAsesor])

  // Bfcache: si el usuario vuelve con "Atrás" tras cerrar sesión, forzar recarga
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload()
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  // Auto-sync al abrir dashboard (solo asesor)
  useEffect(() => {
    if (loading || !isAuthenticated || !isAsesor || !canSync || syncedRef.current) return
    syncedRef.current = true
    getCaracterizacionesPendientes().then(pendientes => {
      if (pendientes.length > 0) {
        syncAll().then(() => loadAsesorStats())
      }
    })
  }, [loading, isAuthenticated, isAsesor, canSync])

  const loadAsesorStats = async () => {
    if (!user?.id) return
    setIsLoadingStats(true)
    const supabase = createClient()
    try {
      const visitasQuery = supabase
        .from('visitas')
        .select(`
          id,
          radicado_local,
          radicado_oficial,
          fecha_visita,
          nombre_tecnico,
          created_at,
          caracterizaciones!id_visita(
            id_beneficiario,
            estado,
            beneficiarios!id_beneficiario(nombres, apellidos)
          )
        `)
        .or(`asesor_id.eq.${user.id},asesor_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(200)

      const [serverResult, localResult] = await Promise.allSettled([
        visitasQuery,
        Promise.all([getStats(), getAllCaracterizaciones()]),
      ])

      if (serverResult.status === 'fulfilled') {
        const { data, error } = serverResult.value
        if (!error && data) {
          setServerStats({ total: data.length, registros: data })
        }
      }

      if (localResult.status === 'fulfilled') {
        const [s, all] = localResult.value
        setStats(s)
        const unsync = all
          .filter(c => c.estado !== 'SINCRONIZADO')
          .sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime())
          .slice(0, 10)
        setLocalQueue(unsync)
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    await fetch('/auth/signout', { method: 'POST' })
    window.location.href = '/auth/login'
  }

  const handleManualSync = async () => {
    await syncAll()
    await loadAsesorStats()
    toast.success('Sincronización completada')
  }

  // Loading + redirect screen (admin/analista verán esto brevemente)
  if (loading || (!loading && (isAdmin || isAnalista))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // Header compartido
  const Header = () => (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-2 md:gap-3">
          <Image src="/icons/icon-192x192.png" alt="Agro360" width={36} height={36} className="rounded-lg" />
          <div>
            <h1 className="text-base font-bold text-foreground">Agro360</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {isCampesino ? 'Mi Portal' : 'Panel del Asesor'}
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-1.5 md:gap-2">
          {isAsesor && <ConnectionStatus showLabel={false} />}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="gap-2 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{isSigningOut ? 'Saliendo...' : 'Salir'}</span>
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )

  // ── CAMPESINO ──────────────────────────────────────────────────
  if (isCampesino) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">
          <CampesinoDashboard
            userEmail={user?.email || ''}
            userName={profile?.nombre_completo || 'Productor'}
            userNumDoc={profile?.numero_documento}
          />
        </main>
      </div>
    )
  }

  // ── ASESOR ────────────────────────────────────────────────────
  const hasPendingSync = stats.pendientes > 0 || stats.errores > 0
  const allRegistros = serverStats?.registros ?? []
  const q = recentSearch.toLowerCase().trim()
  const filtered = q
    ? allRegistros.filter((item: any) => {
        const carac = item.caracterizaciones?.[0]
        const benef = carac?.beneficiarios
        const nombre = benef ? `${benef.nombres || ''} ${benef.apellidos || ''}`.trim() : item.nombre_tecnico || ''
        const rad = item.radicado_oficial || item.radicado_local || ''
        return nombre.toLowerCase().includes(q) || rad.toLowerCase().includes(q)
      })
    : allRegistros
  const totalPages = Math.max(1, Math.ceil(filtered.length / RECENT_PER_PAGE))
  const safePage = Math.min(recentPage, totalPages)
  const paginated = filtered.slice((safePage - 1) * RECENT_PER_PAGE, safePage * RECENT_PER_PAGE)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">

        {/* Bienvenida + acciones */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground md:text-2xl">
              Bienvenido, {profile?.nombre_completo?.split(' ')[0] || 'Asesor'}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Gestiona tus visitas de caracterización
            </p>
            <Badge variant="outline" className="mt-2 bg-primary/10 text-primary border-primary/20 text-xs">
              Asesor de campo
            </Badge>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => { loadAsesorStats(); toast.info('Actualizando...') }}
              disabled={isLoadingStats}
            >
              {isLoadingStats ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            {hasPendingSync && canSync && (
              <Button
                size="sm"
                className="gap-2"
                onClick={handleManualSync}
                disabled={isSyncing}
              >
                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Sincronizar {stats.pendientes > 0 ? `(${stats.pendientes})` : ''}
              </Button>
            )}
          </div>
        </div>

        <SyncErrorDisplay />

        {/* Stats — relevantes para asesor */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="border-border">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{serverStats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">En servidor</p>
              </div>
            </CardContent>
          </Card>

          <Card className={`${stats.pendientes > 0 ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-border'}`}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stats.pendientes > 0 ? 'bg-yellow-500/10' : 'bg-muted'}`}>
                <Clock className={`h-5 w-5 ${stats.pendientes > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${stats.pendientes > 0 ? 'text-yellow-500' : ''}`}>{stats.pendientes}</p>
                <p className="text-xs text-muted-foreground">Por sincronizar</p>
              </div>
            </CardContent>
          </Card>

          <Card className={`${stats.errores > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-border'} col-span-2 sm:col-span-1`}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stats.errores > 0 ? 'bg-red-500/10' : 'bg-muted'}`}>
                <AlertTriangle className={`h-5 w-5 ${stats.errores > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${stats.errores > 0 ? 'text-red-500' : ''}`}>{stats.errores}</p>
                <p className="text-xs text-muted-foreground">Con errores</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <Card
            className="cursor-pointer transition-all hover:bg-muted/50 hover:shadow-sm"
            onClick={() => router.push('/formulario')}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Nueva Caracterización</p>
                <p className="text-xs text-muted-foreground">Registrar productor</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:bg-muted/50 hover:shadow-sm"
            onClick={() => router.push('/mapa')}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
                <Map className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Mapa NDVI</p>
                <p className="text-xs text-muted-foreground">Ver vegetación</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registros en servidor */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold">
              Mis registros
              {serverStats?.total != null && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">({serverStats.total})</span>
              )}
            </h3>
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar nombre o radicado..."
                value={recentSearch}
                onChange={e => { setRecentSearch(e.target.value); setRecentPage(1) }}
                className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {isLoadingStats ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : paginated.length > 0 ? (
            <>
              <div className="space-y-2">
                {paginated.map((item: any) => {
                  const carac = item.caracterizaciones?.[0]
                  const benef = carac?.beneficiarios
                  const nombre = benef
                    ? `${benef.nombres || ''} ${benef.apellidos || ''}`.trim()
                    : item.nombre_tecnico || 'Sin nombre'
                  const estadoLabels: Record<string, string> = {
                    INICIADO: 'Iniciado', REVISADO: 'En Revisión',
                    EN_ESTUDIO_CREDITO: 'En Estudio', APROBADO: 'Viable', CANCELADO: 'No Viable',
                  }
                  const estadoColors: Record<string, string> = {
                    INICIADO: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
                    REVISADO: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                    EN_ESTUDIO_CREDITO: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
                    APROBADO: 'bg-green-500/10 text-green-600 border-green-500/20',
                    CANCELADO: 'bg-red-500/10 text-red-600 border-red-500/20',
                  }
                  const est = carac?.estado || 'INICIADO'
                  return (
                    <Card
                      key={item.id}
                      className="cursor-pointer transition-colors hover:bg-muted/30"
                      onClick={() => router.push(`/dashboard/caracterizacion/${item.id}`)}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-sm">{nombre}</p>
                            <Badge variant="outline" className={`shrink-0 text-xs ${estadoColors[est] || estadoColors.INICIADO}`}>
                              {estadoLabels[est] || est}
                            </Badge>
                          </div>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            {item.radicado_oficial || item.radicado_local} · {new Date(item.created_at).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <p className="text-sm text-muted-foreground">Pág. {safePage} de {totalPages}</p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setRecentPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => setRecentPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Card className="py-10 text-center">
              <CardContent>
                <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium">
                  {recentSearch ? `Sin resultados para "${recentSearch}"` : 'Aún no tienes registros'}
                </p>
                {!recentSearch && (
                  <Button asChild className="mt-4 gap-2" size="sm">
                    <Link href="/formulario">
                      <Plus className="h-4 w-4" />
                      Crear primera caracterización
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cola local */}
          {localQueue.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                Cola local pendiente ({localQueue.length})
              </h4>
              <div className="space-y-2">
                {localQueue.map((item) => {
                  const isError = item.estado === 'ERROR_SINCRONIZACION'
                  return (
                    <Card
                      key={item.radicadoLocal}
                      className={`cursor-pointer transition-colors hover:bg-muted/30 ${isError ? 'border-red-500/20 bg-red-500/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}
                      onClick={() => router.push(`/dashboard/caracterizacion/${encodeURIComponent(item.radicadoLocal)}`)}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isError ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
                          {isError ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <Clock className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{item.nombreProductor || 'Sin nombre'}</p>
                            <Badge variant="outline" className={`shrink-0 text-xs ${isError ? 'bg-red-500/10 text-red-600 border-red-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'}`}>
                              {isError ? 'Error' : 'Pendiente'}
                            </Badge>
                          </div>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{item.radicadoLocal}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
