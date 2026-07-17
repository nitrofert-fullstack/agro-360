"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { AgricultorDashboard } from "@/components/agricultor-dashboard"
import { AppLayout } from "@/components/app-layout"
import { toast } from "sonner"
import { staggerContainer, staggerItem, fadeUp } from "@/lib/animations"
import {
  FileText, Map, Plus, Loader2, Search,
  ChevronLeft, ChevronRight, RefreshCw,
  CheckCircle2, Clock3, TrendingUp, ArrowRight,
  ClipboardCheck, XCircle, MapPin,
} from "lucide-react"

const estadoConfig: Record<string, { label: string; border: string; badge: string }> = {
  INICIADO:           { label: 'Iniciado',    border: 'border-l-slate-400',  badge: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  REVISADO:           { label: 'En Revisión', border: 'border-l-blue-500',   badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  EN_ESTUDIO_CREDITO: { label: 'En Estudio',  border: 'border-l-purple-500', badge: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  APROBADO:           { label: 'Viable',      border: 'border-l-green-500',  badge: 'bg-green-500/10 text-green-600 border-green-500/20' },
  CANCELADO:          { label: 'No Viable',   border: 'border-l-red-500',    badge: 'bg-red-500/10 text-red-600 border-red-500/20' },
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, profile, loading, isAuthenticated, isAdmin } = useAuth()
  const isAnalista = profile?.rol === 'analista'
  const isAsesor = profile?.rol === 'asesor'
  const isAgricultor = profile?.rol === 'agricultor'
  const statsLoadedRef = useRef(false)
  const [serverStats, setServerStats] = useState<{ total: number; registros: any[] } | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [recentSearch, setRecentSearch] = useState("")
  const [recentPage, setRecentPage] = useState(1)
  const RECENT_PER_PAGE = 8

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated) { router.replace('/auth/login'); return }
    if (isAdmin || isAnalista) { router.replace('/admin/estadisticas'); return }
    if (!statsLoadedRef.current) {
      statsLoadedRef.current = true
      if (isAsesor) {
        let mounted = true
        loadAsesorStats(() => mounted)
        return () => { mounted = false }
      }
    }
  }, [loading, isAuthenticated, isAdmin, isAnalista, isAsesor])

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => { if (e.persisted) window.location.reload() }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  const loadAsesorStats = async (isMounted: () => boolean = () => true) => {
    if (!user?.id) return
    setIsLoadingStats(true)
    const supabase = createClient()
    if (!supabase) { setIsLoadingStats(false); return }
    try {
      const { data, error } = await supabase
        .from('visitas')
        .select(`id,radicado_local,radicado_oficial,fecha_visita,nombre_tecnico,created_at,
          caracterizaciones!id_visita(id_beneficiario,estado,beneficiarios!id_beneficiario(nombres,apellidos))`)
        .eq('asesor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200)
      if (!isMounted()) return
      if (!error && data) setServerStats({ total: data.length, registros: data })
    } catch (err) { console.error('Error loading stats:', err) }
    finally { if (isMounted()) setIsLoadingStats(false) }
  }

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

  if (isAgricultor) {
    if (!profile) return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
    return (
      <AppLayout>
        <AgricultorDashboard
          userEmail={user?.email || ''}
          userName={profile.nombre_completo || 'Productor'}
          userNumDoc={profile.numero_documento}
        />
      </AppLayout>
    )
  }

  // ── ASESOR ──────────────────────────────────────────────────────
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

  const viables   = allRegistros.filter((r: any) => r.caracterizaciones?.[0]?.estado === 'APROBADO').length
  const revision  = allRegistros.filter((r: any) => ['REVISADO','EN_ESTUDIO_CREDITO'].includes(r.caracterizaciones?.[0]?.estado)).length
  const iniciados = allRegistros.filter((r: any) => r.caracterizaciones?.[0]?.estado === 'INICIADO' || !r.caracterizaciones?.[0]?.estado).length
  const noViables = allRegistros.filter((r: any) => ['CANCELADO','RECHAZADO'].includes(r.caracterizaciones?.[0]?.estado)).length

  return (
    <AppLayout>
      <div className="flex flex-col flex-1 min-h-0 gap-5 w-full">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col flex-1 min-h-0 gap-5">

          {/* Hero header */}
          <motion.div variants={fadeUp}>
            <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-5">
              <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <h2 className="text-lg font-semibold sm:text-xl md:text-2xl truncate">
                    Bienvenido, {profile?.nombre_completo?.split(' ')[0] || 'Asesor'}
                  </h2>
                  <p className="text-xs text-muted-foreground hidden sm:block">Gestiona tus visitas de caracterización predial</p>
                  <Badge variant="outline" className="mt-1 w-fit bg-primary/10 text-primary border-primary/20 text-xs">
                    Asesor de campo
                  </Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="rounded-lg bg-background/60 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-sm border border-border/40 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">{serverStats?.total ?? 0}</p>
                    <p className="text-xs text-muted-foreground">registros</p>
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 bg-background/60 backdrop-blur-sm shrink-0"
                    onClick={() => { loadAsesorStats(); toast.info('Actualizando...') }} disabled={isLoadingStats}
                    aria-label="Actualizar">
                    {isLoadingStats ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* KPIs — mismo border-l-4 que estadísticas */}
          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Viables',     value: viables,   icon: CheckCircle2, color: 'text-green-500',  border: 'border-l-green-500',  bg: 'bg-green-500/5' },
              { label: 'En Revisión', value: revision,  icon: Clock3,       color: 'text-blue-500',   border: 'border-l-blue-500',   bg: 'bg-blue-500/5' },
              { label: 'Iniciados',   value: iniciados, icon: TrendingUp,   color: 'text-yellow-500', border: 'border-l-yellow-500', bg: 'bg-yellow-500/5' },
              { label: 'No Viables',  value: noViables, icon: XCircle,      color: 'text-red-500',    border: 'border-l-red-500',    bg: 'bg-red-500/5' },
            ].map(({ label, value, icon: Icon, color, border, bg }) => (
              <Card key={label} className={`border-l-4 ${border} ${bg} border-border/60 transition-all duration-200 hover:-translate-y-0.5`} style={{boxShadow: 'var(--shadow-sm)'}}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Acciones rápidas */}
          <motion.div variants={staggerContainer} className="grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-2">
            <motion.div variants={staggerItem}>
              <Card
                className="cursor-pointer border-l-4 border-l-primary bg-primary/5 border-border/60 transition-all duration-200 hover:-translate-y-1 hover:bg-primary/8"
                style={{boxShadow: 'var(--shadow-sm)'}}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'}
                role="button" tabIndex={0}
                onClick={() => router.push('/formulario')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push('/formulario') } }}
              >
                <CardContent className="flex items-center gap-4 p-5 min-h-[76px]">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">Nueva Caracterización</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Registrar productor agrícola</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary ml-auto" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Card
                className="cursor-pointer border-l-4 border-l-green-500 bg-green-500/5 border-border/60 transition-all duration-200 hover:-translate-y-1 hover:bg-green-500/8"
                style={{boxShadow: 'var(--shadow-sm)'}}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'}
                role="button" tabIndex={0}
                onClick={() => router.push('/mapa')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push('/mapa') } }}
              >
                <CardContent className="flex items-center gap-4 p-5 min-h-[76px]">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-500/15">
                    <MapPin className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">Mapa de Predios</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Ver mis predios registrados</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-green-600 ml-auto" />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Lista de registros */}
          <motion.div variants={fadeUp} className="flex flex-col flex-1 min-h-0 gap-3">
            {/* Cabecera lista */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Mis registros
                {serverStats?.total != null && (
                  <span className="text-sm font-normal text-muted-foreground">({serverStats.total})</span>
                )}
              </h3>
              <div className="relative w-full sm:w-60">
                <label htmlFor="search-registros" className="sr-only">Buscar registros</label>
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="search-registros"
                  type="search"
                  placeholder="Buscar nombre o radicado..."
                  value={recentSearch}
                  onChange={e => { setRecentSearch(e.target.value); setRecentPage(1) }}
                  className="w-full rounded-lg border border-border bg-card/70 py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur-sm"
                />
              </div>
            </div>

            {isLoadingStats ? (
              <div className="flex flex-1 items-center justify-center py-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Cargando registros...</p>
                </div>
              </div>
            ) : paginated.length > 0 ? (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
                  {paginated.map((item: any) => {
                    const carac = item.caracterizaciones?.[0]
                    const benef = carac?.beneficiarios
                    const nombre = benef
                      ? `${benef.nombres || ''} ${benef.apellidos || ''}`.trim()
                      : item.nombre_tecnico || 'Sin nombre'
                    const est = carac?.estado || 'INICIADO'
                    const cfg = estadoConfig[est] || estadoConfig.INICIADO
                    return (
                      <motion.div key={item.id} variants={staggerItem} initial="hidden" animate="visible">
                        <Card
                          className={`cursor-pointer border-l-4 ${cfg.border} bg-card/70 border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:bg-card`}
                          style={{boxShadow: 'var(--shadow-sm)'}}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'}
                          role="button" tabIndex={0}
                          aria-label={`Ver detalle de ${nombre}`}
                          onClick={() => router.push(`/dashboard/caracterizacion/${item.id}`)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/dashboard/caracterizacion/${item.id}`) } }}
                        >
                          <CardContent className="flex items-center gap-3 p-4 min-h-[60px]">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="truncate font-medium text-sm">{nombre}</p>
                                <Badge variant="outline" className={`shrink-0 text-xs ${cfg.badge}`}>
                                  {cfg.label}
                                </Badge>
                              </div>
                              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                {item.radicado_oficial || item.radicado_local}
                                <span className="mx-1.5 text-border">·</span>
                                {new Date(item.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="shrink-0 flex items-center justify-between border-t border-border/60 pt-3">
                    <p className="text-sm text-muted-foreground">Pág. {safePage} de {totalPages}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" className="h-10 w-10" disabled={safePage === 1} onClick={() => setRecentPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-10 w-10" disabled={safePage === totalPages} onClick={() => setRecentPage(p => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-12 text-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <ClipboardCheck className="h-8 w-8 text-primary/50" />
                </div>
                <div>
                  <p className="font-semibold">
                    {recentSearch ? `Sin resultados para "${recentSearch}"` : 'Sin registros aún'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {recentSearch ? 'Intenta con otro término' : 'Crea tu primera caracterización predial'}
                  </p>
                </div>
                {!recentSearch && (
                  <Button asChild className="mt-1 gap-2" size="sm">
                    <Link href="/formulario">
                      <Plus className="h-4 w-4" />
                      Nueva caracterización
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </motion.div>

        </motion.div>
      </div>
    </AppLayout>
  )
}
