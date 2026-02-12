"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function StatusPage() {
  const [status, setStatus] = useState<{
    supabaseUrl: boolean
    supabaseKey: boolean
    indexedDb: boolean
    localStorage: boolean
    serviceWorker: boolean
    online: boolean
    healthCheck: boolean
    loading: boolean
  }>({
    supabaseUrl: false,
    supabaseKey: false,
    indexedDb: false,
    localStorage: false,
    serviceWorker: false,
    online: false,
    healthCheck: false,
    loading: true,
  })

  const checkStatus = async () => {
    setStatus((s) => ({ ...s, loading: true }))

    try {
      // Check env vars
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      // Check IndexedDB
      let hasIndexedDb = false
      try {
        const db = indexedDB.open("test")
        hasIndexedDb = true
      } catch {
        hasIndexedDb = false
      }

      // Check localStorage
      let hasLocalStorage = false
      try {
        localStorage.setItem("test", "test")
        localStorage.removeItem("test")
        hasLocalStorage = true
      } catch {
        hasLocalStorage = false
      }

      // Check service worker
      let hasServiceWorker = false
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistrations()
          hasServiceWorker = reg.length > 0
        } catch {
          hasServiceWorker = false
        }
      }

      // Check online
      const online = navigator.onLine

      // Check health endpoint
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
        indexedDb: hasIndexedDb,
        localStorage: hasLocalStorage,
        serviceWorker: hasServiceWorker,
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
    status.indexedDb &&
    status.localStorage &&
    status.online &&
    status.healthCheck

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Sistema de Verificación</h1>
          <p className="text-muted-foreground">
            Comprueba que tu aplicación está correctamente configurada
          </p>
        </div>

        {/* Main Status */}
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

        {/* Status Checks */}
        <div className="grid gap-3 md:grid-cols-2">
          <StatusItem
            label="Supabase URL"
            ok={status.supabaseUrl}
            detail={
              status.supabaseUrl
                ? "Configurado"
                : "Falta en Vars: NEXT_PUBLIC_SUPABASE_URL"
            }
          />
          <StatusItem
            label="Supabase Anon Key"
            ok={status.supabaseKey}
            detail={
              status.supabaseKey
                ? "Configurado"
                : "Falta en Vars: NEXT_PUBLIC_SUPABASE_ANON_KEY"
            }
          />
          <StatusItem
            label="IndexedDB"
            ok={status.indexedDb}
            detail={status.indexedDb ? "Disponible" : "No disponible"}
          />
          <StatusItem
            label="LocalStorage"
            ok={status.localStorage}
            detail={status.localStorage ? "Disponible" : "No disponible"}
          />
          <StatusItem
            label="Service Worker"
            ok={status.serviceWorker}
            detail={
              status.serviceWorker
                ? "Registrado"
                : "No registrado (PWA puede no funcionar)"
            }
          />
          <StatusItem
            label="Conexión a Internet"
            ok={status.online}
            detail={status.online ? "Online" : "Offline"}
          />
          <StatusItem
            label="Health Check API"
            ok={status.healthCheck}
            detail={status.healthCheck ? "OK" : "Error conectando a API"}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 md:flex-row">
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
        </div>

        {/* Instructions */}
        {!allOk && (
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
                <strong>2. Lee SETUP.md o README_QUICK_START.md</strong> en tu proyecto para pasos
                detallados.
              </p>
              <p>
                <strong>3. Ejecuta el SQL</strong> en Supabase (scripts/001_create_schema.sql)
              </p>
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {allOk && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-sm">¡Listo para usar!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>✅ Todas las verificaciones pasaron</p>
              <p>Ahora puedes:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Ir a /formulario para registrar caracterizaciones</li>
                <li>Ir a /consultar para buscar predios</li>
                <li>Loguarse para sincronizar datos</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function StatusItem({
  label,
  ok,
  detail,
}: {
  label: string
  ok: boolean
  detail: string
}) {
  return (
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
  )
}
