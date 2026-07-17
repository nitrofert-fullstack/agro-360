"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { fadeUp, staggerContainer, staggerItem } from "@/lib/animations"

export default function StatusPage() {
  const [status, setStatus] = useState<{
    supabaseUrl: boolean
    supabaseKey: boolean
    localStorage: boolean
    online: boolean
    healthCheck: boolean
    loading: boolean
  }>({
    supabaseUrl: false,
    supabaseKey: false,
    localStorage: false,
    online: false,
    healthCheck: false,
    loading: true,
  })

  const checkStatus = async () => {
    setStatus((s) => ({ ...s, loading: true }))

    try {
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      let hasLocalStorage = false
      try {
        localStorage.setItem("test", "test")
        localStorage.removeItem("test")
        hasLocalStorage = true
      } catch {
        hasLocalStorage = false
      }

      const online = navigator.onLine

      let healthOk = false
      try {
        const res = await fetch("/api/health", { method: "GET" })
        healthOk = res.ok
      } catch {
        healthOk = false
      }

      setStatus({
        supabaseUrl: hasUrl,
        supabaseKey: hasKey,
        localStorage: hasLocalStorage,
        online,
        healthCheck: healthOk,
        loading: false,
      })
    } catch (error) {
      console.error("Error checking status:", error)
      setStatus((s) => ({ ...s, loading: false }))
    }
  }

  useEffect(() => {
    checkStatus()
  }, [])

  const allOk =
    status.supabaseUrl &&
    status.supabaseKey &&
    status.localStorage &&
    status.online &&
    status.healthCheck

  return (
    <main className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Sistema de Verificación</h1>
          <p className="text-muted-foreground">
            Comprueba que tu aplicación está correctamente configurada
          </p>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {allOk ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Todo está funcionando
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Hay problemas de configuración
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {allOk
                  ? "La aplicación está lista para usar"
                  : "Por favor, revisa los problemas detectados abajo"}
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-3 md:grid-cols-2"
        >
          <StatusItem label="Supabase URL" ok={status.supabaseUrl} detail={status.supabaseUrl ? "Configurado" : "Falta en Vars: NEXT_PUBLIC_SUPABASE_URL"} />
          <StatusItem label="Supabase Anon Key" ok={status.supabaseKey} detail={status.supabaseKey ? "Configurado" : "Falta en Vars: NEXT_PUBLIC_SUPABASE_ANON_KEY"} />
          <StatusItem label="LocalStorage" ok={status.localStorage} detail={status.localStorage ? "Disponible" : "No disponible"} />
          <StatusItem label="Conexión a Internet" ok={status.online} detail={status.online ? "Online" : "Offline"} />
          <StatusItem label="Health Check API" ok={status.healthCheck} detail={status.healthCheck ? "OK" : "Error conectando a API"} />
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col gap-3 md:flex-row">
          <Button onClick={checkStatus} disabled={status.loading} className="gap-2">
            {status.loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Verificar de Nuevo
              </>
            )}
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Volver al Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/formulario">Ir al Formulario</Link>
          </Button>
        </motion.div>

        {!allOk && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-sm">¿Qué hacer?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong>1. Variables de Supabase:</strong> Ve al sidebar izquierdo (Vars) y agrega:
                </p>
                <code className="block rounded bg-black p-2 text-white">
                  NEXT_PUBLIC_SUPABASE_URL=...
                  <br />
                  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
                </code>
                <p>
                  <strong>2. Lee SETUP.md o README_QUICK_START.md</strong> en tu proyecto para pasos detallados.
                </p>
                <p>
                  <strong>3. Ejecuta el SQL</strong> en Supabase (scripts/001_create_schema.sql)
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {allOk && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-sm">¡Listo para usar!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>✅ Todas las verificaciones pasaron</p>
                <p>Ahora puedes:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Ir a /formulario para registrar caracterizaciones</li>
                  <li>Ir a /dashboard para ver y gestionar predios</li>
                  <li>Loguarse para sincronizar datos</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </main>
  )
}

function StatusItem({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <motion.div variants={staggerItem}>
      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-6">
          <div>
            <p className="font-medium">{label}</p>
            <p className="text-sm text-muted-foreground">{detail}</p>
          </div>
          {ok ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
