"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/hooks/use-auth"
import { staggerContainer, staggerItem, fadeUp, scaleIn } from "@/lib/animations"
import {
  MapPin,
  FileText,
  Shield,
  BarChart3,
  Users,
  ArrowRight,
  Map,
  Sprout,
  Mountain,
  LogIn,
  LayoutDashboard
} from "lucide-react"

export default function Home() {
  const { isAuthenticated, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-2 md:gap-3">
            <Image src="/icons/icon-192x192.png" alt="Santander Agro360" width={64} height={64} className="rounded-xl" />
          </div>
          <nav className="flex items-center gap-1 md:gap-2">
            {!loading && (
              isAuthenticated ? (
                <Button asChild variant="default" size="sm" className="gap-2">
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="default" size="sm" className="gap-2">
                  <Link href="/auth/login">
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Iniciar Sesión</span>
                  </Link>
                </Button>
              )
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-6xl px-6 py-20 text-center"
        >
          <motion.div variants={scaleIn} className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <MapPin className="h-8 w-8 text-primary" />
          </motion.div>
          <motion.h2 variants={fadeUp} className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Sistema de Caracterización Predial para Santander
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Plataforma integral para el registro, análisis y monitoreo de predios agrícolas
            utilizando tecnología satelital NDVI y herramientas geoespaciales avanzadas.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/formulario">
                <FileText className="h-5 w-5" />
                Iniciar Caracterización
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mb-12 text-center"
        >
          <h3 className="text-2xl font-bold text-foreground">Funcionalidades Principales</h3>
          <p className="mt-2 text-muted-foreground">
            Herramientas diseñadas para el sector agropecuario de Santander
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[
            { icon: Sprout, color: "green", title: "Índice NDVI", desc: "Monitoreo de vegetación en tiempo real con datos satelitales NASA MODIS", body: "Visualiza la salud de los cultivos con mapas de vegetación coloreados que muestran desde zonas áridas hasta vegetación densa." },
            { icon: Mountain, color: "blue", title: "Capas Climáticas", desc: "Temperatura y precipitación actualizadas con OpenWeatherMap", body: "Analiza las condiciones climáticas de cada predio para tomar decisiones informadas sobre cultivos y riesgos." },
            { icon: FileText, color: "purple", title: "Caracterización Digital", desc: "Formulario completo basado en estándares del sector agropecuario", body: "Registra información del productor, predio, producción y aspectos financieros de forma estructurada y segura." },
            { icon: MapPin, color: "orange", title: "Geolocalización", desc: "Marca puntos o dibuja polígonos para delimitar predios", body: "Herramientas de dibujo interactivas para definir con precisión los límites de cada predio agrícola." },
            { icon: BarChart3, color: "cyan", title: "Análisis de Áreas", desc: "Cálculo automático de áreas, perímetros y estadísticas", body: "Dibuja zonas en el mapa y obtén mediciones precisas para planificación y análisis de terrenos." },
            { icon: Shield, color: "red", title: "Gestión Administrativa", desc: "Panel para revisión, aprobación y seguimiento de solicitudes", body: "Los administradores pueden revisar caracterizaciones, analizar predios con herramientas NDVI y aprobar solicitudes." },
          ].map(({ icon: Icon, color, title, desc, body }) => (
            <motion.div key={title} variants={staggerItem}>
              <Card className="h-full border-border bg-card/50 transition-all hover:bg-card hover:shadow-md hover:-translate-y-0.5">
                <CardHeader>
                  <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-${color}-500/10`}>
                    <Icon className={`h-6 w-6 text-${color}-500`} />
                  </div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <CardDescription>{desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Cards */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-6 md:grid-cols-2"
        >
          <motion.div variants={staggerItem}>
            <Card className="h-full border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <Users className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle>Para Agricultores</CardTitle>
                    <CardDescription>Registre su predio en minutos</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Complete el formulario de caracterización con ayuda de un asesor.
                  Marque la ubicación de su predio y envíe su solicitud para revisión.
                </p>
                <Button asChild className="w-full gap-2">
                  <Link href="/formulario">
                    Completar Formulario
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card className="h-full border-border bg-card/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                    <Shield className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <CardTitle>Para Administradores</CardTitle>
                    <CardDescription>Gestione las solicitudes</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Acceda al panel de administración para revisar caracterizaciones,
                  analizar predios con NDVI y aprobar o rechazar solicitudes.
                </p>
                <Button asChild variant="outline" className="w-full gap-2 bg-transparent">
                  <Link href="/admin">
                    Ir al Panel Admin
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <Image src="/icons/icon-192x192.png" alt="Santander Agro360" width={28} height={28} className="rounded-lg" />
                <span className="text-sm font-bold">Santander Agro360</span>
              </div>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Sistema de caracterización predial para el sector agropecuario de Santander, Colombia.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-foreground">Navegación</h4>
              <div className="flex flex-col gap-2">
                <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
                  Acceso Asesores
                </Link>
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-foreground">Cuenta</h4>
              <div className="flex flex-col gap-2">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                  Iniciar Sesión
                </Link>
                <Link href="/registro" className="text-sm text-muted-foreground hover:text-foreground">
                  Crear Cuenta
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            <p>Santander Agro360 - Santander, Colombia</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
