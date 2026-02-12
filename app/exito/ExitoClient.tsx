"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, FileText, Home, Plus, Cloud, Copy, Download, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ConnectionStatus } from "@/components/connection-status"
import { SyncButton } from "@/components/sync-button"
import { useAuth } from "@/hooks/use-auth"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { exportToJSON } from "@/lib/db/indexed-db"
import { useState } from "react"

export default function ExitoPage() {
  const searchParams = useSearchParams()
  const radicado = searchParams.get("radicado")
  const { isAuthenticated } = useAuth()
  const { isOnline } = useOnlineStatus()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (radicado) {
      await navigator.clipboard.writeText(radicado)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadBackup = async () => {
    try {
      const jsonString = await exportToJSON()
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `backup-agrosantander360-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error creating backup:", error)
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
            <span className="text-lg font-semibold">AgroSantander360</span>
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
            {/* Radicado */}
            {radicado && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-2 text-sm text-muted-foreground">Numero de Radicado Local</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="rounded bg-background px-3 py-2 font-mono text-sm">
                    {radicado}
                  </code>
                  <Button variant="ghost" size="icon" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copied && (
                  <p className="mt-2 text-xs text-green-600">Copiado al portapapeles</p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Guarda este numero para consultar el estado de la caracterizacion
                </p>
              </div>
            )}

            {/* Status alerts */}
            {!isOnline && (
              <Alert>
                <Cloud className="h-4 w-4" />
                <AlertDescription>
                  Estas sin conexion. El formulario esta guardado localmente y se sincronizara cuando tengas internet.
                </AlertDescription>
              </Alert>
            )}

            {isOnline && !isAuthenticated && (
              <Alert>
                <Cloud className="h-4 w-4" />
                <AlertDescription>
                  Para sincronizar con el servidor, debes{" "}
                  <Link href="/auth/login" className="font-medium text-primary underline">
                    iniciar sesion
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            )}

            {isOnline && isAuthenticated && (
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
              <Button variant="outline" onClick={handleDownloadBackup} className="gap-2">
                <Download className="h-4 w-4" />
                Descargar Respaldo
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
                <li>1. Sincroniza cuando tengas conexion e inicies sesion</li>
                <li>2. Proporciona el numero de radicado al campesino</li>
                <li>3. El campesino puede consultar con su documento y radicado</li>
                <li>4. Descarga un respaldo periodicamente por seguridad</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
