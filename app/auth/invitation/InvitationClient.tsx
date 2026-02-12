"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Leaf, Mail, Lock, Eye, EyeOff, AlertCircle, User, Phone, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"

export default function InvitationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get("token") || ""
  
  const { signUp } = useAuth()
  const supabase = createClient()
  
  const [step, setStep] = useState<"token" | "register">(tokenFromUrl ? "register" : "token")
  const [token, setToken] = useState(tokenFromUrl)
  const [invitationData, setInvitationData] = useState<{ email: string; rol: string } | null>(null)
  
  const [formData, setFormData] = useState({
    nombreCompleto: "",
    telefono: "",
    password: "",
    confirmPassword: "",
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateToken = async () => {
    setError(null)
    setIsSubmitting(true)
    
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select("email, rol, usado, expira_en")
        .eq("token", token)
        .single()
      
      if (error || !data) {
        setError("Codigo de invitacion invalido")
        setIsSubmitting(false)
        return
      }
      
      if (data.usado) {
        setError("Este codigo ya ha sido utilizado")
        setIsSubmitting(false)
        return
      }
      
      if (new Date(data.expira_en) < new Date()) {
        setError("Este codigo ha expirado")
        setIsSubmitting(false)
        return
      }
      
      setInvitationData({ email: data.email, rol: data.rol })
      setStep("register")
    } catch {
      setError("Error validando el codigo")
    }
    
    setIsSubmitting(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }
    
    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const { error: signUpError } = await signUp(
        invitationData!.email,
        formData.password,
        {
          nombre_completo: formData.nombreCompleto,
          telefono: formData.telefono,
        }
      )
      
      if (signUpError) {
        setError(signUpError)
        setIsSubmitting(false)
        return
      }
      
      // Mark invitation as used
      await supabase
        .from("invitations")
        .update({ usado: true })
        .eq("token", token)
      
      router.push("/auth/sign-up-success")
    } catch {
      setError("Error al registrar la cuenta")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Leaf className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {step === "token" ? "Codigo de Invitacion" : "Crear Cuenta"}
          </CardTitle>
          <CardDescription>
            {step === "token" 
              ? "Ingresa el codigo que recibiste por correo"
              : `Completa tu registro para ${invitationData?.email}`
            }
          </CardDescription>
        </CardHeader>
        
        {step === "token" ? (
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="token">Codigo de invitacion</Label>
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="token"
                  placeholder="INV-XXXXXX"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <Button 
              onClick={validateToken} 
              className="w-full" 
              disabled={isSubmitting || !token}
            >
              {isSubmitting ? "Validando..." : "Validar codigo"}
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm">
                  <span className="text-muted-foreground">Correo: </span>
                  <span className="font-medium">{invitationData?.email}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Rol: </span>
                  <span className="font-medium capitalize">{invitationData?.rol}</span>
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nombreCompleto">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="nombreCompleto"
                    placeholder="Tu nombre completo"
                    value={formData.nombreCompleto}
                    onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefono">Telefono (opcional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="telefono"
                    type="tel"
                    placeholder="300 123 4567"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </CardFooter>
          </form>
        )}
        
        <CardFooter className="justify-center border-t pt-4">
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Inicia sesion
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
