"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Smartphone, Database, Bell } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { staggerContainer, staggerItem } from "@/lib/animations"

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
    <AppLayout>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-2xl px-4 py-6 md:px-6"
      >
        <div className="space-y-6">
          {/* Configuración de sesión */}
          <motion.div variants={staggerItem}><Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Conexión
              </CardTitle>
              <CardDescription>
                La aplicación requiere conexión a internet para funcionar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Almacenamiento de sesión</Label>
                  <p className="text-sm text-muted-foreground">
                    La sesión se guarda en localStorage para mantener el acceso
                  </p>
                </div>
                <div className="h-9 px-3 rounded-lg border border-border bg-muted flex items-center">
                  <span className="text-sm font-medium text-foreground">Habilitado</span>
                </div>
              </div>
            </CardContent>
          </Card></motion.div>

          {/* Datos y privacidad */}
          <motion.div variants={staggerItem}><Card>
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
                <Label className="text-sm">Sesión activa</Label>
                <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
                  <p className="text-muted-foreground">
                    Los datos se almacenan en Supabase. Para cerrar sesión en todos los dispositivos, cierre sesión desde el menú principal.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card></motion.div>

          {/* Notificaciones */}
          <motion.div variants={staggerItem}><Card>
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
          </Card></motion.div>

          {/* Información técnica */}
          <motion.div variants={staggerItem}><Card>
            <CardHeader>
              <CardTitle className="text-base">Información técnica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Versión: 1.0.0</p>
              <p>Almacenamiento: Supabase (nube) + LocalStorage (sesión)</p>
              <p>Autenticación: Supabase Auth (JWT)</p>
            </CardContent>
          </Card></motion.div>
        </div>
      </motion.div>
    </AppLayout>
  )
}
