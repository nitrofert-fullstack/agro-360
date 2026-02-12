"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, RefreshCw, AlertTriangle, Bug } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error for debugging
    console.error("[v0] Application error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icono de error */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 bg-destructive/10 rounded-full animate-pulse" />
          <div className="absolute inset-4 bg-destructive/20 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertTriangle className="h-16 w-16 text-destructive" />
          </div>
        </div>
        
        {/* Texto */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-destructive">Error</h1>
          <h2 className="text-2xl font-semibold text-foreground">
            Algo salio mal
          </h2>
          <p className="text-muted-foreground">
            Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
            Por favor intenta de nuevo o vuelve al inicio.
          </p>
        </div>
        
        {/* Detalles del error (solo en desarrollo) */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-muted/50 rounded-lg p-4 text-left">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Bug className="h-4 w-4" />
              <span className="font-medium">Detalles del error:</span>
            </div>
            <code className="text-xs text-destructive break-all">
              {error.message}
            </code>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-2">
                ID: {error.digest}
              </p>
            )}
          </div>
        )}
        
        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Intentar de nuevo
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Ir al inicio
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
