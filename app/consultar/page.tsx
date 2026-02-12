"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
<<<<<<< HEAD
import { Search, FileText, User, MapPin, Calendar, Clock, CheckCircle, AlertCircle, Loader2, ArrowLeft, Leaf, LogOut, Download, FileSpreadsheet, Printer } from "lucide-react"
=======
import { Search, FileText, User, MapPin, Calendar, Clock, CheckCircle, AlertCircle, Loader2, ArrowLeft, Leaf, LogOut, Download, Image, PenTool, Paperclip, Eye } from "lucide-react"
>>>>>>> 72364074bbe5a10bc7adb3c8496f46446e5530ae
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
  foto_1_url: string | null
  foto_2_url: string | null
  firma_productor_url: string | null
  beneficiario: {
    primer_nombre: string
    segundo_nombre: string | null
    primer_apellido: string
    segundo_apellido: string | null
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
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultados, setResultados] = useState<ServerCaracterizacion[]>([])

  const supabase = createClient()

  // Proteger ruta: redirigir si no esta autenticado
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  const selectQuery = `
    id, radicado_local, radicado_oficial, estado, created_at, fecha_sincronizacion, observaciones,
    foto_1_url, foto_2_url, firma_productor_url,
    beneficiario:beneficiarios!id_beneficiario(primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento, tipo_documento),
    predio:predios!id_predio(nombre_predio, municipio, vereda),
    visita:visitas!id_visita(fecha_visita, nombre_tecnico)
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
      if (!supabase) {
        setError("Sistema no configurado correctamente. Intente mas tarde.")
        setIsSearching(false)
        return
      }

      if (!documento) {
        setError("Ingresa un numero de documento para buscar")
        setIsSearching(false)
        return
      }

      // Buscar por documento en beneficiarios
      const { data: beneficiarios, error: benefErr } = await supabase
        .from('beneficiarios')
        .select('id')
        .eq('numero_documento', documento)

      if (benefErr) throw benefErr

      if (!beneficiarios || beneficiarios.length === 0) {
        setError("No se encontraron registros con ese documento. Si acaba de registrarlo, asegurese de sincronizar primero.")
      } else {
        const benefIds = beneficiarios.map((b: { id: string }) => b.id)
        const { data, error: queryErr } = await supabase
          .from('caracterizaciones')
          .select(selectQuery)
          .in('id_beneficiario', benefIds)
          .order('created_at', { ascending: false })

        if (queryErr) throw queryErr

        const results = (data || []) as unknown as ServerCaracterizacion[]
        if (results.length === 0) {
          setError("No se encontraron caracterizaciones para ese documento")
        } else {
<<<<<<< HEAD
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
          const benefIds = beneficiarios.map((b: any) => b.id)
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
=======
          setResultados(results)
>>>>>>> 4bb2e0015a4ead7b7d7af87d34c57990e7f183e6
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

<<<<<<< HEAD
  const exportToCSV = () => {
    if (resultados.length === 0) return
    const headers = ["Radicado", "Estado", "Nombre", "Documento", "Predio", "Municipio", "Vereda", "Fecha Registro", "Tecnico"]
    const rows = resultados.map((r) => {
      const nombre = r.beneficiario
        ? [r.beneficiario.primer_nombre, r.beneficiario.segundo_nombre, r.beneficiario.primer_apellido, r.beneficiario.segundo_apellido].filter(Boolean).join(" ")
        : ""
      return [
        r.radicado_oficial || r.radicado_local,
        r.estado,
        nombre,
        r.beneficiario?.numero_documento || "",
        r.predio?.nombre_predio || "",
        r.predio?.municipio || "",
        r.predio?.vereda || "",
        new Date(r.created_at).toLocaleDateString("es-CO"),
        r.visita?.nombre_tecnico || "",
      ]
    })
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n")
    const BOM = "\uFEFF"
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `consulta-agrosantander-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Archivo Excel (CSV) descargado")
  }

  const exportToPDF = () => {
    window.print()
=======
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleDownloadAttachment = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      toast.success(`Descargando ${filename}`)
    } catch {
      // Fallback: open in new tab if fetch fails (e.g. CORS)
      if (!url.startsWith('data:')) {
        window.open(url, '_blank')
        toast.success("Abriendo archivo en nueva ventana")
      } else {
        toast.error("Error al descargar el archivo")
      }
    }
>>>>>>> 72364074bbe5a10bc7adb3c8496f46446e5530ae
  }

  const renderResultado = (res: ServerCaracterizacion) => {
    const nombre = res.beneficiario
      ? [res.beneficiario.primer_nombre, res.beneficiario.segundo_nombre, res.beneficiario.primer_apellido, res.beneficiario.segundo_apellido].filter(Boolean).join(' ')
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

          {/* Anexos / Archivos adjuntos */}
          {(res.foto_1_url || res.foto_2_url || res.firma_productor_url) && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                  Anexos
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {res.foto_1_url && (
                    <div className="group relative overflow-hidden rounded-lg border border-border bg-muted/30 p-3">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                          <Image className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">Foto 1 del Predio</p>
                          <p className="text-xs text-muted-foreground">Imagen</p>
                        </div>
                      </div>
                      <div className="mb-3 overflow-hidden rounded-md">
                        <img
                          src={res.foto_1_url}
                          alt="Foto 1 del Predio"
                          className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => handleDownloadAttachment(res.foto_1_url!, `foto-1-predio-${res.radicado_oficial || res.radicado_local}.jpg`)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Descargar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setPreviewUrl(res.foto_1_url)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {res.foto_2_url && (
                    <div className="group relative overflow-hidden rounded-lg border border-border bg-muted/30 p-3">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                          <Image className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">Foto 2 del Predio</p>
                          <p className="text-xs text-muted-foreground">Imagen</p>
                        </div>
                      </div>
                      <div className="mb-3 overflow-hidden rounded-md">
                        <img
                          src={res.foto_2_url}
                          alt="Foto 2 del Predio"
                          className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => handleDownloadAttachment(res.foto_2_url!, `foto-2-predio-${res.radicado_oficial || res.radicado_local}.jpg`)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Descargar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setPreviewUrl(res.foto_2_url)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {res.firma_productor_url && (
                    <div className="group relative overflow-hidden rounded-lg border border-border bg-muted/30 p-3">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-500/10">
                          <PenTool className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">Firma del Productor</p>
                          <p className="text-xs text-muted-foreground">Firma digital</p>
                        </div>
                      </div>
                      <div className="mb-3 overflow-hidden rounded-md bg-white p-2">
                        <img
                          src={res.firma_productor_url}
                          alt="Firma del Productor"
                          className="h-24 w-full object-contain"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => handleDownloadAttachment(res.firma_productor_url!, `firma-productor-${res.radicado_oficial || res.radicado_local}.png`)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Descargar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setPreviewUrl(res.firma_productor_url)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <Link href="/dashboard" className="flex items-center gap-2 md:gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 md:h-10 md:w-10">
              <Leaf className="h-5 w-5 text-primary md:h-6 md:w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground md:text-lg">AgroSantander360</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">Caracterizacion Predial</p>
            </div>
          </Link>

          <nav className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>

            <div className="hidden h-6 w-px bg-border md:block" />
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden text-muted-foreground md:inline">{profile?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>

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
              Ingresa el numero de documento del productor para consultar sus caracterizaciones.
              Los registros deben estar sincronizados para poder consultarlos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="documento">Numero de Documento del Productor</Label>
                <Input
                  id="documento"
                  placeholder="Ej: 1098765432"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value.trim())}
                />
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
                disabled={isSearching || !documento}
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

        {resultados.length > 0 && (
          <div className="mb-4 flex items-center justify-between print:hidden">
            <h3 className="text-lg font-semibold">
              {resultados.length === 1 ? "1 resultado encontrado" : `${resultados.length} resultados encontrados`}
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
                <Printer className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        )}

        {resultados.length === 1 && renderResultado(resultados[0])}

        {resultados.length > 1 && (
          <div className="space-y-4">
            {resultados.map((r) => renderResultado(r))}
          </div>
        )}

        {resultados.length === 0 && !error && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-medium">Busca una caracterizacion</h3>
            <p className="text-sm text-muted-foreground">
              Ingresa el numero de documento del productor para consultar el estado de sus caracterizaciones.
            </p>
          </div>
        )}
      </main>

      {/* Modal de vista previa */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-lg bg-white p-2 shadow-2xl dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-black/50 p-0 text-white hover:bg-black/70"
              onClick={() => setPreviewUrl(null)}
            >
              &times;
            </Button>
            <img
              src={previewUrl}
              alt="Vista previa"
              className="max-h-[85vh] max-w-full rounded object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
