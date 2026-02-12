"use client"

import { WifiOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <WifiOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Sin conexion</CardTitle>
          <CardDescription>
            No tienes conexion a internet en este momento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Puedes seguir registrando formularios de caracterizacion. 
            Tus datos se guardaran localmente y se sincronizaran cuando vuelvas a tener conexion.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar conexion
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/formulario">Continuar con formularios</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
