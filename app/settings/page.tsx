"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Smartphone, Database, Bell, Leaf } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export default function SettingsPage() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState({
    notificacionesEnabled: true,
    syncAutomatico: true,
    dataBackup: false,
  })

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const handleToggle = (key: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Leaf className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">Agro360</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <div className="space-y-6">
          {/* Configuración offline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Modo Offline
              </CardTitle>
              <CardDescription>
                Configura cómo funciona la aplicación sin conexión
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Sincronización automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Sincronizar formularios automáticamente al recuperar conexión
                  </p>
                </div>
                <Switch 
                  checked={settings.syncAutomatico}
                  onCheckedChange={() => handleToggle('syncAutomatico')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Almacenamiento local</Label>
                  <p className="text-sm text-muted-foreground">
                    Los datos se guardan en IndexedDB para acceso offline
                  </p>
                </div>
                <div className="h-9 px-3 rounded-lg border border-border bg-muted flex items-center">
                  <span className="text-sm font-medium text-foreground">Habilitado</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Datos y privacidad */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Datos y Privacidad
              </CardTitle>
              <CardDescription>
                Gestiona tus datos almacenados localmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Datos almacenados localmente</Label>
                <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
                  <p className="text-muted-foreground">
                    Se almacenan en IndexedDB para acceso offline y se sincroniza automáticamente al conectarse
                  </p>
                </div>
              </div>

              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  if (confirm("¿Estás seguro? Se eliminarán todos los datos locales.")) {
                    // Implementar limpieza
                    console.log("Limpiando datos locales")
                  }
                }}
              >
                Limpiar datos locales
              </Button>
            </CardContent>
          </Card>

          {/* Notificaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificaciones
              </CardTitle>
              <CardDescription>
                Controla qué notificaciones recibes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Notificaciones</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibir alertas de sincronización y estados
                  </p>
                </div>
                <Switch 
                  checked={settings.notificacionesEnabled}
                  onCheckedChange={() => handleToggle('notificacionesEnabled')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Información técnica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información técnica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Versión: 1.0.0</p>
              <p>PWA: Instalable</p>
              <p>Almacenamiento: IndexedDB + LocalStorage</p>
              <p>Sincronización: Basada en JWT</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
