"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Home, Plus } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { staggerContainer, staggerItem, celebrationVariants, fadeUp } from "@/lib/animations"

export default function ExitoPage() {
  const searchParams = useSearchParams()
  const radicado = searchParams.get("radicado")

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <motion.header
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="border-b border-border bg-card/80 backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icons/icon-192x192.png" alt="Santander Agro360" width={48} height={48} className="rounded-xl" />
          </Link>
        </div>
      </motion.header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <Card className="text-center overflow-hidden">
            <CardHeader className="pb-4">
              <motion.div
                variants={celebrationVariants}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10"
              >
                <CheckCircle className="h-10 w-10 text-green-500" />
              </motion.div>
              <motion.div variants={staggerItem}>
                <CardTitle className="text-2xl">Caracterización Registrada</CardTitle>
                <CardDescription className="mt-1">
                  El formulario se envió correctamente al servidor.
                </CardDescription>
              </motion.div>
            </CardHeader>

            <CardContent className="space-y-6">
              {radicado && (
                <motion.div variants={staggerItem} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className="mb-1 text-xs text-muted-foreground">Radicado oficial</p>
                  <code className="font-mono text-xs text-muted-foreground">{radicado}</code>
                </motion.div>
              )}

              <motion.div variants={staggerItem}>
                <Alert className="border-green-500/20 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    Tu registro fue enviado al servidor exitosamente. El equipo técnico lo revisará pronto.
                  </AlertDescription>
                </Alert>
              </motion.div>

              <motion.div variants={staggerItem} className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
                <Button asChild>
                  <Link href="/formulario" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nuevo Formulario
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard" className="gap-2">
                    <Home className="h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              </motion.div>

              <motion.div variants={staggerItem} className="rounded-lg bg-muted/50 p-4 text-left">
                <h4 className="mb-2 font-medium">Próximos pasos:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>1. Un técnico revisará y aprobará tu solicitud.</li>
                  <li>2. Si proporcionaste correo, recibirás una confirmación por email.</li>
                  <li>3. Cuando sea aprobada, recibirás tus credenciales de acceso.</li>
                  <li>4. Mientras tanto, consulta el estado por tu número de documento.</li>
                </ul>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
