"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Home, Plus, Cloud, Download, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ConnectionStatus } from "@/components/connection-status"
import { SyncButton } from "@/components/sync-button"
import { useAuth } from "@/hooks/use-auth"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { getCaracterizacionByRadicado } from "@/lib/db/indexed-db"
import { generateCaracterizacionPDF, pdfFromLocalData } from "@/lib/generate-pdf"

export default function ExitoPage() {
  const searchParams = useSearchParams()
  const radicado = searchParams.get("radicado")
  const synced = searchParams.get("synced") === "1"
  const { isAuthenticated } = useAuth()
  const { isOnline } = useOnlineStatus()
  const handleDownloadPDF = async () => {
    try {
      if (radicado) {
        const local = await getCaracterizacionByRadicado(radicado)
        if (local) {
          generateCaracterizacionPDF(pdfFromLocalData(local))
          return
        }
      }
      alert('No se encontraron datos para generar el PDF')
    } catch (error) {
      console.error("Error generating PDF:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Leaf className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-semibold">Agro360</span>
          </Link>
          <div className="flex items-center gap-3">
            <ConnectionStatus />
            <SyncButton variant="compact" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Caracterizacion Registrada</CardTitle>
            <CardDescription>
              El formulario se ha guardado correctamente en tu dispositivo
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Radicado — solo referencia */}
            {radicado && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="mb-1 text-xs text-muted-foreground">Referencia interna del registro</p>
                <code className="font-mono text-xs text-muted-foreground">{radicado}</code>
              </div>
            )}

            {/* Status alerts */}
            {!isOnline && (
              <Alert>
                <Cloud className="h-4 w-4" />
                <AlertDescription>
                  Estas sin conexion. Tu formulario esta guardado localmente y se enviara al servidor automaticamente cuando recuperes internet.
                </AlertDescription>
              </Alert>
            )}

            {isOnline && synced && (
              <Alert className="border-green-500/20 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  Tu registro fue enviado al servidor exitosamente. El equipo tecnico lo revisara pronto.
                </AlertDescription>
              </Alert>
            )}

            {isOnline && !synced && !isAuthenticated && (
              <Alert className="border-yellow-500/20 bg-yellow-500/5">
                <Cloud className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                  Tu registro esta guardado localmente. Se intentara enviar al servidor automaticamente en breve.
                </AlertDescription>
              </Alert>
            )}

            {isOnline && isAuthenticated && !synced && (
              <Alert className="border-green-500/20 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  Puedes sincronizar ahora con el boton de arriba o hacerlo mas tarde.
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href="/formulario" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Formulario
                </Link>
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard" className="gap-2">
                  <Home className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            </div>

            {/* Info box */}
            <div className="rounded-lg bg-muted/50 p-4 text-left">
              <h4 className="mb-2 font-medium">Proximos pasos:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>1. Tu registro se envia automaticamente al servidor cuando hay internet</li>
                <li>2. Un tecnico revisara y aprobara tu solicitud</li>
                <li>3. Si proporcionaste correo, recibiras una confirmacion por email</li>
                <li>4. Cuando sea aprobada, recibiras tus credenciales de acceso</li>
                <li>5. Mientras tanto, consulta el estado por tu numero de documento</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
