"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Mail, Phone, Shield, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { createClient } from "@/lib/supabase/client"
import { staggerContainer, staggerItem } from "@/lib/animations"

const rolLabels: Record<string, string> = {
  admin: "Administrador",
  analista: "Analista",
  asesor: "Asesor de campo",
  agricultor: "Agricultor",
  campesino: "Productor",
}

export default function SettingsPage() {
  const { user, profile, isAuthenticated, loading } = useAuth()
  const router = useRouter()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/auth/login")
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated || !user) return null

  const initials = profile?.nombre_completo
    ? profile.nombre_completo.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() || "U"

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)

    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "La nueva contraseña debe tener al menos 8 caracteres." })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Las contraseñas nuevas no coinciden." })
      return
    }

    setIsChanging(true)
    const supabase = createClient()
    if (!supabase) { setIsChanging(false); return }

    // Verificar contraseña actual re-autenticando
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })
    if (signInError) {
      setPasswordMsg({ type: "error", text: "La contraseña actual es incorrecta." })
      setIsChanging(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordMsg({ type: "error", text: error.message })
    } else {
      setPasswordMsg({ type: "success", text: "Contraseña actualizada correctamente." })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    }
    setIsChanging(false)
  }

  return (
    <AppLayout>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-2xl overflow-y-auto"
      >
        <div className="space-y-6 pb-8">
          <div>
            <h2 className="text-xl font-semibold">Mi Cuenta</h2>
            <p className="text-sm text-muted-foreground">Información de perfil y seguridad</p>
          </div>

          {/* Perfil */}
          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Perfil</CardTitle>
                <CardDescription>Tus datos de acceso al sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Avatar + nombre */}
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
                    <p className="font-semibold text-base">{profile?.nombre_completo || "Sin nombre"}</p>
                    <p className="text-sm text-muted-foreground">{rolLabels[profile?.rol ?? ""] ?? profile?.rol ?? "Usuario"}</p>
                    {profile?.activo !== undefined && (
                      <span className={`inline-flex items-center gap-1 text-xs mt-0.5 ${profile.activo ? "text-green-600" : "text-red-500"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${profile.activo ? "bg-green-500" : "bg-red-500"}`} />
                        {profile.activo ? "Activo" : "Inactivo"}
                      </span>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Correo electrónico</Label>
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm truncate">{user.email}</span>
                    </div>
                  </div>

                  {profile?.telefono && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Teléfono</Label>
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                        <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm">{profile.telefono}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Rol</Label>
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                      <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm">{rolLabels[profile?.rol ?? ""] ?? profile?.rol ?? "Usuario"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Cambiar contraseña */}
          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Cambiar contraseña
                </CardTitle>
                <CardDescription>Ingresa tu contraseña actual y la nueva para actualizarla</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password">Contraseña actual</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrent ? "text" : "password"}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="Tu contraseña actual"
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">Nueva contraseña</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repite la nueva contraseña"
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {passwordMsg && (
                    <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                      passwordMsg.type === "success"
                        ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                        : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}>
                      {passwordMsg.type === "success"
                        ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      }
                      {passwordMsg.text}
                    </div>
                  )}

                  <Button type="submit" disabled={isChanging} className="w-full min-h-[44px]">
                    {isChanging ? "Actualizando..." : "Actualizar contraseña"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </AppLayout>
  )
}
