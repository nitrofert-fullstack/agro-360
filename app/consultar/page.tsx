"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, FileText, User, MapPin, Calendar, Clock, CheckCircle, AlertCircle, Loader2, ArrowLeft, Leaf, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { ThemeToggle } from "@/components/theme-toggle"
import { toast } from "sonner"

interface ServerCaracterizacion {
  id: string
  radicado_local: string
  radicado_oficial: string | null
  estado: string
  created_at: string
  fecha_sincronizacion: string | null
  observaciones: string | null
  beneficiario: {
    nombres: string
    apellidos: string
    numero_documento: string
    tipo_documento: string
  } | null
  predio: {
    nombre_predio: string
    municipio: string | null
    vereda: string | null
  } | null
  visita: {
    fecha_visita: string | null
    nombre_tecnico: string | null
  } | null
}

export default function ConsultarPage() {
  const router = useRouter()
  const { user, profile, signOut, isAuthenticated, loading: authLoading } = useAuth()
  const [documento, setDocumento] = useState("")
  const [radicado, setRadicado] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultados, setResultados] = useState<ServerCaracterizacion[]>([])

  const supabase = createClient()

  const selectQuery = `
    id, radicado_local, radicado_oficial, estado, created_at, fecha_sincronizacion, observaciones,
    beneficiario:beneficiarios!beneficiario_id(nombres, apellidos, numero_documento, tipo_documento),
    predio:predios!predio_id(nombre_predio, municipio, vereda),
    visita:visitas!visita_id(fecha_visita, nombre_tecnico)
  `

  const handleSignOut = async () => {
    await signOut()
    toast.success("Sesion cerrada correctamente")
    router.push('/')
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResultados([])
    setIsSearching(true)

    try {
      // Guard: verificar que Supabase esté configurado
      if (!supabase) {
        setError("Sistema no configurado correctamente. Intente mas tarde.")
        setIsSearching(false)
        return
      }

      // Siempre buscar en el servidor (Supabase)
      if (radicado) {
        const { data, error: queryErr } = await supabase
          .from('caracterizaciones')
          .select(selectQuery)
          .or(`radicado_local.eq.${radicado},radicado_oficial.eq.${radicado}`)

        if (queryErr) throw queryErr

        const results = (data || []) as unknown as ServerCaracterizacion[]

        if (documento) {
          const filtered = results.filter(r => r.beneficiario?.numero_documento === documento)
          if (filtered.length === 0 && results.length > 0) {
            setError("El documento no coincide con el radicado proporcionado")
          } else if (filtered.length === 0) {
            setError("No se encontro ningun registro con ese radicado")
          } else {
            setResultados(filtered)
          }
        } else {
          if (results.length === 0) {
            setError("No se encontro ningun registro con ese radicado. Si acaba de registrarlo, asegurese de sincronizar primero.")
          } else {
            setResultados(results)
          }
        }
      } else if (documento) {
        // Buscar por documento en beneficiarios
        const { data: beneficiarios, error: benefErr } = await supabase
          .from('beneficiarios')
          .select('id')
          .eq('numero_documento', documento)

        if (benefErr) throw benefErr

        if (!beneficiarios || beneficiarios.length === 0) {
          setError("No se encontraron registros con ese documento. Si acaba de registrarlo, asegurese de sincronizar primero.")
        } else {
          const benefIds = beneficiarios.map(b => b.id)
          const { data, error: queryErr } = await supabase
            .from('caracterizaciones')
            .select(selectQuery)
            .in('beneficiario_id', benefIds)
            .order('created_at', { ascending: false })

          if (queryErr) throw queryErr

          const results = (data || []) as unknown as ServerCaracterizacion[]
          if (results.length === 0) {
            setError("No se encontraron caracterizaciones para ese documento")
          } else {
            setResultados(results)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al realizar la consulta")
    }

    setIsSearching(false)
  }

  const getEstadoBadge = (estado: string) => {
    const estados: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
      'pendiente': { label: 'Pendiente', variant: 'outline', className: 'border-yellow-500/50 text-yellow-600 bg-yellow-500/10' },
      'sincronizado': { label: 'Sincronizado', variant: 'outline', className: 'border-green-500/50 text-green-600 bg-green-500/10' },
      'en_revision': { label: 'En Revision', variant: 'outline', className: 'border-blue-500/50 text-blue-600 bg-blue-500/10' },
      'aprobado': { label: 'Aprobado', variant: 'outline', className: 'border-green-600/50 text-green-700 bg-green-600/10' },
      'rechazado': { label: 'Rechazado', variant: 'destructive' },
    }
    const config = estados[estado] || { label: estado, variant: 'outline' as const }
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
  }

  const getEstadoDescription = (estado: string) => {
    const desc: Record<string, string> = {
      'pendiente': 'Su solicitud fue recibida y esta pendiente de revision por parte del equipo tecnico.',
      'sincronizado': 'Su solicitud fue sincronizada correctamente y esta en espera de revision.',
      'en_revision': 'Su solicitud esta siendo revisada por un asesor tecnico.',
      'aprobado': 'Su solicitud fue aprobada. Pronto sera contactado por un asesor.',
      'rechazado': 'Su solicitud fue rechazada. Contacte a su asesor para mas informacion.',
    }
    return desc[estado] || 'Estado en proceso.'
  }

  const renderResultado = (res: ServerCaracterizacion) => {
    const nombre = res.beneficiario
      ? [res.beneficiario.nombres, res.beneficiario.apellidos].filter(Boolean).join(' ')
      : 'Sin nombre'

    return (
      <Card key={res.id} className="overflow-hidden">
        <CardHeader className="bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <span className="truncate">{res.radicado_oficial || res.radicado_local}</span>
              </CardTitle>
              <CardDescription className="mt-1.5">
                {res.estado === 'sincronizado' || res.estado === 'en_revision' || res.estado === 'aprobado' || res.estado === 'rechazado' ? (
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Registro sincronizado con el servidor
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
                    <Clock className="h-3.5 w-3.5" />
                    Registro pendiente de sincronizacion
                  </span>
                )}
              </CardDescription>
            </div>
            {getEstadoBadge(res.estado)}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Estado description */}
          <div className="mb-6 rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">{getEstadoDescription(res.estado)}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <User className="h-4 w-4" />
                Informacion del Productor
              </h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="font-medium">{nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Documento</p>
                  <p className="font-medium">{res.beneficiario?.numero_documento || 'Sin documento'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Informacion del Predio
              </h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Nombre del Predio</p>
                  <p className="font-medium">{res.predio?.nombre_predio || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Municipio</p>
                  <p className="font-medium">{res.predio?.municipio || 'Sin municipio'}</p>
                </div>
                {res.predio?.vereda && (
                  <div>
                    <p className="text-xs text-muted-foreground">Vereda</p>
                    <p className="font-medium">{res.predio.vereda}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha de Registro</p>
                <p className="text-sm font-medium">
                  {new Date(res.created_at).toLocaleDateString('es-CO', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {res.visita?.nombre_tecnico && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Asesor Tecnico</p>
                  <p className="text-sm font-medium">{res.visita.nombre_tecnico}</p>
                </div>
              </div>
            )}

            {res.radicado_oficial && res.radicado_oficial !== res.radicado_local && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Radicado Oficial</p>
                  <p className="text-sm font-medium font-mono">{res.radicado_oficial}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2 md:gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 md:h-10 md:w-10">
              <Leaf className="h-5 w-5 text-primary md:h-6 md:w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground md:text-lg">AgroSantander360</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">Caracterizacion Predial</p>
            </div>
          </Link>

          <nav className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Volver</span>
            </Button>

            {isAuthenticated && (
              <>
                <div className="hidden h-6 w-px bg-border md:block" />
                <div className="flex items-center gap-2 text-sm">
                  <span className="hidden text-muted-foreground md:inline">{profile?.email}</span>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Salir</span>
                  </Button>
                </div>
              </>
            )}

            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Consultar Caracterizacion
            </CardTitle>
            <CardDescription>
              Ingresa tu numero de documento y/o radicado para consultar el estado de tu caracterizacion predial.
              Los registros deben estar sincronizados para poder consultarlos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="documento">Numero de Documento</Label>
                  <Input
                    id="documento"
                    placeholder="Ej: 1098765432"
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value.trim())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="radicado">Numero de Radicado</Label>
                  <Input
                    id="radicado"
                    placeholder="Ej: RAD-1770319428814-6UGL"
                    value={radicado}
                    onChange={(e) => setRadicado(e.target.value.trim())}
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full md:w-auto"
                disabled={isSearching || (!documento && !radicado)}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Consultar
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {resultados.length === 1 && renderResultado(resultados[0])}

        {resultados.length > 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Se encontraron {resultados.length} registros
            </h3>
            {resultados.map((r) => renderResultado(r))}
          </div>
        )}

        {resultados.length === 0 && !error && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-medium">Busca tu caracterizacion</h3>
            <p className="text-sm text-muted-foreground">
              Ingresa tu numero de documento o el numero de radicado que te proporciono el asesor para consultar el estado de tu caracterizacion predial.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
