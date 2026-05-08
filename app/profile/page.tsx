"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Mail, Phone, Shield } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { staggerContainer, staggerItem } from "@/lib/animations"

export default function ProfilePage() {
  const { user, profile, isAuthenticated, loading } = useAuth()
  const router = useRouter()

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

  if (!isAuthenticated || !user) {
    return null
  }

  const initials = profile?.nombre_completo
    ? profile.nombre_completo
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
    : user.email?.[0].toUpperCase() || "U"

  return (
    <AppLayout>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-2xl px-4 py-6 md:px-6"
      >
        <div className="space-y-6">
          {/* Perfil Card */}
          <motion.div variants={staggerItem}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Mi Perfil</CardTitle>
              <CardDescription>Información de tu cuenta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar y nombre */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                    alt={profile?.nombre_completo}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{profile?.nombre_completo}</p>
                  <p className="text-sm text-muted-foreground">
                    {({ admin: 'Administrador', analista: 'Analista', asesor: 'Asesor', agricultor: 'Agricultor' } as Record<string, string>)[profile?.rol ?? ''] ?? 'Usuario'}
                  </p>
                </div>
              </div>

              {/* Información de cuenta */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Correo</Label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                </div>

                {profile?.telefono && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Teléfono</Label>
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile.telefono}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Rol</Label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {({ admin: 'Administrador', analista: 'Analista', asesor: 'Asesor', agricultor: 'Agricultor' } as Record<string, string>)[profile?.rol ?? ''] ?? 'Usuario'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Estado</Label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                    <div className={`h-2 w-2 rounded-full ${profile?.activo ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-sm">
                      {profile?.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          {/* Información de seguridad */}
          <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seguridad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tu sesión está protegida con tokens JWT. Los tokens se renuevan automáticamente para mantener tu acceso activo.
              </p>
            </CardContent>
          </Card>
          </motion.div>
        </div>
      </motion.div>
    </AppLayout>
  )
}
