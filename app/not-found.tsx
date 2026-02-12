"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, Search, MapPin } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icono grande */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
          <div className="absolute inset-4 bg-primary/20 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="h-16 w-16 text-primary" />
          </div>
        </div>
        
        {/* Texto */}
        <div className="space-y-3">
          <h1 className="text-7xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">
            Pagina no encontrada
          </h2>
          <p className="text-muted-foreground">
            Lo sentimos, la pagina que buscas no existe o ha sido movida.
            Puede que hayas escrito mal la direccion o que el enlace este desactualizado.
          </p>
        </div>
        
        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Ir al inicio
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/formulario">
              <Search className="h-4 w-4" />
              Registrar formulario
            </Link>
          </Button>
        </div>
        
        {/* Link de volver */}
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver atras
        </Button>
      </div>
    </div>
  )
}
