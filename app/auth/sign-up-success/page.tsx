"use client"

import Link from "next/link"
import { CheckCircle, Mail } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { scaleIn, staggerContainer, staggerItem, celebrationVariants } from "@/lib/animations"

export default function SignUpSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <motion.div variants={scaleIn} initial="hidden" animate="visible" className="w-full max-w-md">
        <Card className="text-center">
          <CardHeader>
            <motion.div variants={celebrationVariants} className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </motion.div>
            <CardTitle className="text-2xl">Registro exitoso</CardTitle>
            <CardDescription>
              Tu cuenta ha sido creada correctamente
            </CardDescription>
          </CardHeader>

          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <CardContent className="space-y-4">
              <motion.div variants={staggerItem} className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Mail className="h-5 w-5" />
                  <span className="text-sm">Revisa tu correo electrónico</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Te hemos enviado un enlace de confirmación.
                  Haz clic en él para activar tu cuenta.
                </p>
              </motion.div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <motion.div variants={staggerItem} className="w-full">
                <Button asChild className="w-full">
                  <Link href="/auth/login">Ir a iniciar sesión</Link>
                </Button>
              </motion.div>
              <motion.p variants={staggerItem} className="text-xs text-muted-foreground">
                ¿No recibiste el correo? Revisa tu carpeta de spam.
              </motion.p>
            </CardFooter>
          </motion.div>
        </Card>
      </motion.div>
    </main>
  )
}
