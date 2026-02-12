"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, LogIn, ShieldAlert, ArrowLeft } from "lucide-react"

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icono */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 bg-amber-500/10 rounded-full animate-pulse" />
          <div className="absolute inset-4 bg-amber-500/20 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldAlert className="h-16 w-16 text-amber-500" />
          </div>
        </div>
        
        {/* Texto */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-amber-500">Acceso Restringido</h1>
          <h2 className="text-2xl font-semibold text-foreground">
            Debes iniciar sesion
          </h2>
          <p className="text-muted-foreground">
            Esta seccion requiere que estes autenticado como asesor.
            Por favor inicia sesion para continuar.
          </p>
        </div>
        
        {/* Mensaje informativo */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-left">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Si eres un campesino y quieres consultar tu informacion, 
            puedes hacerlo desde la seccion de <Link href="/consultar" className="underline font-medium">consultas</Link> sin necesidad de iniciar sesion.
          </p>
        </div>
        
        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default" className="gap-2">
            <Link href="/login">
              <LogIn className="h-4 w-4" />
              Iniciar sesion
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Ir al inicio
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
