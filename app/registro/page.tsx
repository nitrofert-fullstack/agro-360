"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import { Mail, Lock, User, Phone, Loader2, Eye, EyeOff, ChevronLeft, CheckCircle, Info, CreditCard } from "lucide-react"
import { scaleIn, celebrationVariants } from "@/lib/animations"
import { LegalDocumentModal, LEGAL_DOCUMENTS } from "@/components/legal-document-modal"

export default function RegistroPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    numeroDocumento: "",
    email: "",
    telefono: "",
    password: "",
    confirmPassword: "",
    aceptaTerminos: false,
  })
  const [error, setError] = useState("")
  const [legalModalOpen, setLegalModalOpen] = useState<keyof typeof LEGAL_DOCUMENTS | null>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) {
      document.getElementById('nombre')?.focus()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }
    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }
    if (!formData.numeroDocumento.trim()) {
      setError("El número de documento es requerido")
      return
    }
    if (!formData.aceptaTerminos) {
      setError("Debes aceptar los términos y condiciones")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/registro-agricultor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          nombre_completo: formData.nombre,
          telefono: formData.telefono || undefined,
          numero_documento: formData.numeroDocumento.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al crear la cuenta')
        return
      }

      setSuccess(true)
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
          <motion.div variants={scaleIn} initial="hidden" animate="visible" className="w-full max-w-md">
            <Card className="shadow-xl text-center">
              <CardHeader className="pb-4">
                <motion.div variants={celebrationVariants} className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </motion.div>
                <CardTitle className="text-2xl">¡Cuenta creada!</CardTitle>
                <CardDescription className="text-base">
                  Tu cuenta de agricultor fue registrada exitosamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-green-500/20 bg-green-500/5 text-left">
                  <Info className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    Puedes iniciar sesión ahora con tu correo y contraseña para ver tus registros.
                  </AlertDescription>
                </Alert>
                <Button asChild className="w-full">
                  <Link href="/auth/login">Iniciar Sesión</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
      </div>
    )
  }

  return (
    <>
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <motion.div variants={scaleIn} initial="hidden" animate="visible" className="w-full max-w-lg">
        <Card className="shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <Link
              href="/auth/login"
              className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver a iniciar sesión
            </Link>
            <div className="flex items-center gap-3">
              <Image src="/icons/icon-384x384.png" alt="Santander Agro360" width={72} height={72} className="rounded-2xl" />
              <div>
                <CardTitle className="text-xl font-bold">Crear Cuenta de Agricultor</CardTitle>
                <CardDescription>
                  Regístrate para acceder al sistema como productor agrícola
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-5 border-primary/20 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Este registro es solo para <strong>agricultores y productores</strong>.
                Los asesores técnicos y administradores son invitados por un administrador del sistema.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-sm font-medium">
                    Nombre completo *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="nombre"
                      type="text"
                      autoComplete="name"
                      placeholder="Juan Perez"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="h-11 pl-10 text-base md:text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono" className="text-sm font-medium">
                    Teléfono
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="telefono"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="300 123 4567"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="h-11 pl-10 text-base md:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroDocumento" className="text-sm font-medium">
                  Número de documento *
                </Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="numeroDocumento"
                    type="text"
                    placeholder="Ej: 1098765432"
                    value={formData.numeroDocumento}
                    onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value.replace(/\D/g, '') })}
                    className="h-11 pl-10 text-base md:text-sm"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Usa el mismo número de documento con el que fuiste registrado en el formulario de caracterización.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Correo electrónico *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="correo@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-11 pl-10 text-base md:text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Contraseña *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Mín. 8 caracteres"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="h-11 pl-10 pr-10 text-base md:text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirmar contraseña *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Repite tu contraseña"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="h-11 pl-10 pr-10 text-base md:text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Ocultar confirmación" : "Mostrar confirmación"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="terminos"
                  checked={formData.aceptaTerminos}
                  onCheckedChange={(checked) => setFormData({ ...formData, aceptaTerminos: checked as boolean })}
                  className="mt-0.5"
                />
                <Label htmlFor="terminos" className="text-sm font-normal leading-relaxed text-muted-foreground">
                  Acepto los{" "}
                  <button
                    type="button"
                    onClick={() => setLegalModalOpen("autorizacionTratamientoDatos")}
                    className="text-primary hover:underline font-normal"
                  >
                    términos y condiciones
                  </button>{" "}
                  y la{" "}
                  <button
                    type="button"
                    onClick={() => setLegalModalOpen("avisoPrivacidad")}
                    className="text-primary hover:underline font-normal"
                  >
                    política de privacidad
                  </button>
                </Label>
              </div>

              <Button
                type="submit"
                className="mt-2 h-12 w-full text-base md:h-11 md:text-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  "Crear Cuenta de Agricultor"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">¿Ya tienes una cuenta? </span>
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                Inicia sesión
              </Link>
            </div>
          </CardContent>
        </Card>
        </motion.div>
    </div>

    {legalModalOpen && (
      <LegalDocumentModal
        open={legalModalOpen !== null}
        onOpenChange={(open) => !open && setLegalModalOpen(null)}
        title={LEGAL_DOCUMENTS[legalModalOpen].title}
        description={LEGAL_DOCUMENTS[legalModalOpen].description}
        documentUrl={LEGAL_DOCUMENTS[legalModalOpen].url}
        showAcceptButton={false}
      />
    )}
    </>
  )
}
