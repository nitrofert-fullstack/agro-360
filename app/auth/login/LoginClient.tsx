"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"
import { staggerContainer, staggerItem, scaleIn } from "@/lib/animations"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, loading } = useAuth()
  // Validar redirectTo: solo rutas internas relativas (evitar open redirect)
  const rawRedirect = searchParams.get('redirectTo') || '/dashboard'
  const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.startsWith('/\\')
    ? rawRedirect
    : '/dashboard'
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) {
      document.getElementById('email')?.focus()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error } = await signIn(email, password)
    
    if (error) {
      setError(error)
      setIsSubmitting(false)
    } else {
      router.push(redirectTo)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <motion.div
        variants={scaleIn}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        <Card className="border-border/60 bg-card/80 backdrop-blur-md" style={{boxShadow: 'var(--shadow-lg)'}}>
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <CardHeader className="text-center pb-6">
              <motion.div variants={staggerItem} className="mx-auto mb-4">
                <Image src="/icons/icon-384x384.png" alt="Santander Agro360" width={96} height={96} className="rounded-2xl" />
              </motion.div>
              <motion.div variants={staggerItem}>
                <CardTitle className="font-display text-2xl font-bold">Iniciar Sesión</CardTitle>
                <CardDescription>
                  Ingresa tus credenciales para acceder al sistema
                </CardDescription>
              </motion.div>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                <motion.div variants={staggerItem} className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="correo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </motion.div>

                <motion.div variants={staggerItem} className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
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
                </motion.div>

                <motion.div variants={staggerItem} className="flex items-center justify-end">
                  <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </motion.div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <motion.div variants={staggerItem} className="w-full">
                  <Button type="submit" className="w-full min-h-[48px] text-base" disabled={isSubmitting || loading}>
                    {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
                  </Button>
                </motion.div>

                <motion.div
                  variants={staggerItem}
                  className="w-full rounded-lg border border-border bg-muted/30 p-3 text-center text-sm"
                >
                  <p className="text-muted-foreground mb-1">
                    ¿Eres agricultor y aún no tienes cuenta?
                  </p>
                  <Link href="/registro" className="font-medium text-primary hover:underline">
                    Regístrate aquí
                  </Link>
                </motion.div>
              </CardFooter>
            </form>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  )
}
