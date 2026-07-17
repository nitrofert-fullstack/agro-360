"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Home, LogIn, ShieldAlert, ArrowLeft } from "lucide-react"
import { staggerContainer, staggerItem, celebrationVariants } from "@/lib/animations"

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="max-w-md w-full text-center space-y-8"
      >
        {/* Icono */}
        <motion.div variants={celebrationVariants} className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 bg-amber-500/10 rounded-full animate-pulse" />
          <div className="absolute inset-4 bg-amber-500/20 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldAlert className="h-16 w-16 text-amber-500" />
          </div>
        </motion.div>

        {/* Texto */}
        <motion.div variants={staggerItem} className="space-y-3">
          <h1 className="text-4xl font-bold text-amber-500">Acceso Restringido</h1>
          <h2 className="text-2xl font-semibold text-foreground">Debes iniciar sesion</h2>
          <p className="text-muted-foreground">
            Esta seccion requiere autenticacion. Por favor inicia sesion para continuar.
          </p>
        </motion.div>

        {/* Mensaje informativo */}
        <motion.div variants={staggerItem} className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-left">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Si ya tienes una cuenta, inicia sesion con tus credenciales de acceso.
          </p>
        </motion.div>

        {/* Acciones */}
        <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default" className="gap-2">
            <Link href="/auth/login">
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
        </motion.div>

        <motion.div variants={staggerItem}>
          <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            Volver atras
          </Button>
        </motion.div>
      </motion.div>
    </main>
  )
}
