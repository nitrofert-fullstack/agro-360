"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { ConnectionStatus } from "@/components/connection-status"
import { SyncButton } from "@/components/sync-button"
import { SyncErrorDisplay } from "@/components/sync-error-display"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { getStats, getAllCaracterizaciones, type CaracterizacionLocal } from "@/lib/db/indexed-db"
import { CampesinoDashboard } from "@/components/campesino-dashboard"
import { toast } from "sonner"
import {
  Leaf,
  FileText,
  Map,
  Plus,
  Shield,
  Search,
  Cloud,
  CloudOff,
  LogOut,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Loader2,
} from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const { user, profile, loading, isAuthenticated, isAdmin, signOut } = useAuth()
  const [stats, setStats] = useState({ total: 0, pendientes: 0, sincronizados: 0, errores: 0 })
  const [recentItems, setRecentItems] = useState<CaracterizacionLocal[]>([])
  const [serverStats, setServerStats] = useState<any>(null)
  const [statsLoaded, setStatsLoaded] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }
    if (!loading && isAuthenticated && !statsLoaded) {
      setStatsLoaded(true)
      loadStats()
    }
  }, [loading, isAuthenticated, router, statsLoaded])

  const loadStats = async () => {
    // Cargar datos locales de IndexedDB
    const s = await getStats()
    setStats(s)
    const all = await getAllCaracterizaciones()
    // Solo mostrar registros NO sincronizados en la sección local (los sincronizados aparecen en servidor)
    const noSincronizados = all.filter(c => c.estado !== 'SINCRONIZADO')
    setRecentItems(noSincronizados.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime()).slice(0, 5))
    
    // Cargar datos del servidor si está logueado y Supabase está configurado
    try {
      const supabase = createClient()
      if (!supabase) {
        return
      }

      // Cargar registros sincronizados del servidor
      if (user?.id) {
        const { data: serverVisitas, error } = await supabase
          .from('visitas')
          .select(`
            id,
            radicado_local,
            radicado_oficial,
            estado,
            fecha_visita,
            nombre_tecnico,
            created_at,
            caracterizaciones!id_visita(
              id_beneficiario,
              beneficiarios!id_beneficiario(nombres, apellidos)
            )
          `)
          .eq('asesor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (!error && serverVisitas) {
          setServerStats({
            total: serverVisitas.length,
            registros: serverVisitas
          })
        } else if (error) {
          console.log("[v0] Error loading server stats:", error)
        }
      }
    } catch (err) {
      console.log("[v0] Error loading server stats:", err)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success("Sesion cerrada correctamente")
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary md:h-10 md:w-10">
              <Leaf className="h-5 w-5 text-primary-foreground md:h-6 md:w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground md:text-lg">AgroSantander360</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">Dashboard</p>
            </div>
          </div>
          <nav className="flex items-center gap-1.5 md:gap-2">
            <ConnectionStatus />
            <SyncButton variant="compact" onSyncComplete={() => loadStats()} />
            <div className="hidden h-6 w-px bg-border md:block" />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* Si es campesino, mostrar su dashboard especial */}
        {profile?.rol === 'campesino' ? (
          <CampesinoDashboard
            userEmail={user?.email || ''}
            userName={profile?.nombre_completo || 'Productor'}
          />
        ) : (
        <>
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Bienvenido, {profile?.nombre_completo || user?.email || 'Usuario'}
          </h2>
          <p className="mt-1 text-muted-foreground">
            {isAdmin ? 'Panel de administracion - gestiona las caracterizaciones' : 'Panel del asesor - registra y sincroniza caracterizaciones'}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <User className="mr-1 h-3 w-3" />
              {profile?.rol === 'admin' ? 'Administrador' : 'Asesor'}
            </Badge>
          </div>
        </div>

        {/* Error Display */}
        <SyncErrorDisplay />

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total registros</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-500">{stats.pendientes}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-500">{stats.sincronizados}</p>
                <p className="text-sm text-muted-foreground">Sincronizados</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-red-500">{stats.errores}</p>
                <p className="text-sm text-muted-foreground">Con errores</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Acciones rapidas</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => router.push('/formulario')}>
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Plus className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Nuevo Formulario</p>
                  <p className="text-xs text-muted-foreground">Registrar caracterizacion</p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => router.push('/mapa')}>
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10">
                  <Map className="h-7 w-7 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold">Mapa NDVI</p>
                  <p className="text-xs text-muted-foreground">Explorar vegetacion satelital</p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => router.push('/consultar')}>
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
                  <Search className="h-7 w-7 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold">Consultar</p>
                  <p className="text-xs text-muted-foreground">Buscar por documento</p>
                </div>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => router.push('/admin')}>
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
                    <Shield className="h-7 w-7 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold">Administracion</p>
                    <p className="text-xs text-muted-foreground">Gestionar solicitudes</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Sync Status */}
        {stats.pendientes > 0 && (
          <Card className="mb-8 border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <CloudOff className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Tienes {stats.pendientes} formulario{stats.pendientes > 1 ? 's' : ''} por sincronizar</p>
                  <p className="text-sm text-muted-foreground">Sincroniza cuando tengas conexion a internet</p>
                </div>
              </div>
              <SyncButton onSyncComplete={() => loadStats()} />
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-foreground">Actividad reciente</h3>
          <div className="space-y-4">
            {/* Local registros */}
            {recentItems.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">Registros locales</h4>
                <div className="space-y-2">
                  {recentItems.map((item) => {
                    const estadoMap: Record<string, { label: string; color: string }> = {
                      'PENDIENTE_SINCRONIZACION': { label: 'Pendiente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
                      'SINCRONIZADO': { label: 'Sincronizado', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
                      'ERROR_SINCRONIZACION': { label: 'Error', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
                    }
                    const est = estadoMap[item.estado] || estadoMap['PENDIENTE_SINCRONIZACION']

                    return (
                      <Card
                        key={item.radicadoLocal}
                        className="cursor-pointer transition-colors hover:bg-muted/30"
                        onClick={() => router.push(`/dashboard/caracterizacion/${encodeURIComponent(item.radicadoLocal)}`)}
                      >
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium">{item.nombreProductor || 'Sin nombre'}</p>
                              <Badge variant="outline" className={est.color}>{est.label}</Badge>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span className="font-mono text-xs">{item.radicadoLocal}</span>
                              <span>{new Date(item.fechaRegistro).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Servidor registros */}
            {serverStats?.registros && serverStats.registros.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">Sincronizados en servidor</h4>
                <div className="space-y-2">
                  {serverStats.registros.map((item: any) => {
                    const carac = item.caracterizaciones?.[0]
                    const benef = carac?.beneficiarios
                    const nombreProductor = benef ? `${benef.nombres || ''} ${benef.apellidos || ''}`.trim() : item.nombre_tecnico || 'Sin nombre'

                    return (
                    <Card
                      key={item.id}
                      className="cursor-pointer transition-colors hover:bg-muted/30 border-green-500/20 bg-green-500/5"
                      onClick={() => router.push(`/dashboard/caracterizacion/${item.id}`)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">
                              {nombreProductor}
                            </p>
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                              {item.estado === 'SINCRONIZADO' ? 'Sincronizado' : item.estado}
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="font-mono text-xs">{item.radicado_oficial || item.radicado_local}</span>
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {recentItems.length === 0 && !serverStats?.registros?.length && (
              <Card className="py-12 text-center">
                <CardContent>
                  <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h4 className="mb-2 text-lg font-medium">No hay registros aun</h4>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Crea tu primer formulario de caracterizacion para empezar
                  </p>
                  <Button asChild>
                    <Link href="/formulario" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Crear Formulario
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        </>
        )}
      </main>
    </div>
  )
}
