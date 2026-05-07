"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Mail, AlertCircle, ArrowLeft, CheckCircle } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"
import { scaleIn, staggerContainer, staggerItem, celebrationVariants } from "@/lib/animations"

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) {
      document.getElementById('email')?.focus()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await resetPassword(email)
    
    if (error) {
      setError(error)
    } else {
      setSuccess(true)
    }
    
    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <motion.div variants={scaleIn} initial="hidden" animate="visible" className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <motion.div variants={celebrationVariants} className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
              </motion.div>
              <CardTitle className="text-2xl">Correo Enviado</CardTitle>
              <CardDescription>
                Revisa tu bandeja de entrada para el enlace de recuperacion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Hemos enviado un correo electronico a <strong>{email}</strong> con instrucciones para recuperar tu contraseña.
              </p>
              <p className="text-xs text-muted-foreground">
                Si no recibes el correo en los proximos minutos, revisa tu carpeta de spam.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/auth/login">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Login
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <motion.div variants={scaleIn} initial="hidden" animate="visible" className="w-full max-w-md">
        <Card>
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <CardHeader className="text-center pb-6">
              <motion.div variants={staggerItem} className="mx-auto mb-4">
                <Image src="/icons/icon-384x384.png" alt="Santander Agro360" width={96} height={96} className="rounded-2xl" />
              </motion.div>
              <motion.div variants={staggerItem}>
                <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
                <CardDescription>
                  Ingresa tu correo para recibir instrucciones de recuperacion
                </CardDescription>
              </motion.div>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
                <motion.div variants={staggerItem} className="space-y-2">
                  <Label htmlFor="email">Correo electronico</Label>
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
                  <p className="text-xs text-muted-foreground">
                    Ingresa el correo electronico asociado a tu cuenta
                  </p>
                </motion.div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <motion.div variants={staggerItem} className="w-full flex flex-col gap-4">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar instrucciones"}
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/auth/login" className="gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Volver al Login
                    </Link>
                  </Button>
                </motion.div>
              </CardFooter>
            </form>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  )
}
