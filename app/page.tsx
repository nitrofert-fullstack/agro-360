"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/hooks/use-auth"
import {
  MapPin, FileText, Shield, BarChart3, Users, ArrowRight,
  Map, Sprout, Mountain, LogIn, LayoutDashboard, Satellite,
  TreePine, ClipboardCheck
} from "lucide-react"

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

export default function Home() {
  const { isAuthenticated, loading } = useAuth()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Image src="/icons/icon-192x192.png" alt="Santander Agro360" width={36} height={36} className="rounded-xl" />
            <span className="font-semibold text-sm hidden sm:block">Santander Agro360</span>
          </div>
          <nav className="flex items-center gap-2">
            {!loading && (
              isAuthenticated ? (
                <Button asChild size="sm" className="gap-2 h-9">
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm" className="gap-2 h-9">
                  <Link href="/auth/login">
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Iniciar sesión</span>
                  </Link>
                </Button>
              )
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero — split layout */}
      <section className="relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-0 h-[600px] w-[600px] rounded-full bg-primary/6 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-primary/4 blur-3xl" />
          {/* Líneas topográficas decorativas */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04] dark:opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="topo" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M0 40 Q20 20 40 40 Q60 60 80 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                <path d="M0 60 Q20 40 40 60 Q60 80 80 60" fill="none" stroke="currentColor" strokeWidth="1"/>
                <path d="M0 20 Q20 0 40 20 Q60 40 80 20" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#topo)"/>
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid min-h-[90vh] items-center gap-12 py-16 md:grid-cols-2 md:py-20">
            {/* Left — texto */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-6"
            >
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                  <MapPin className="h-3 w-3" />
                  Santander, Colombia
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Caracterización<br />
                <span className="text-primary">Predial</span><br />
                Inteligente
              </motion.h1>

              <motion.p variants={fadeUp} className="max-w-lg text-base text-muted-foreground sm:text-lg">
                Plataforma digital para el registro, análisis y monitoreo de predios agrícolas en Santander.
                Tecnología satelital NDVI, geolocalización y gestión administrativa en un solo lugar.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-2 min-h-[48px] px-6">
                  <Link href="/formulario">
                    <ClipboardCheck className="h-5 w-5" />
                    Iniciar Caracterización
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2 min-h-[48px] px-6 bg-transparent">
                  <Link href="/auth/login">
                    <LogIn className="h-5 w-5" />
                    Acceso Asesores
                  </Link>
                </Button>
              </motion.div>

              {/* Stats */}
              <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                {[
                  { value: "87", label: "Municipios" },
                  { value: "NDVI", label: "Satélite" },
                  { value: "100%", label: "Digital" },
                ].map(({ value, label }) => (
                  <div key={label} className="text-center">
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right — visual card grid */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 gap-3"
            >
              {[
                { icon: Satellite, title: "NDVI Satelital", desc: "NASA MODIS", color: "text-green-500", bg: "bg-green-500/10" },
                { icon: MapPin, title: "Geolocalización", desc: "Polígonos precisos", color: "text-blue-500", bg: "bg-blue-500/10" },
                { icon: ClipboardCheck, title: "Formulario Digital", desc: "9 secciones", color: "text-primary", bg: "bg-primary/10" },
                { icon: Mountain, title: "Capas Climáticas", desc: "Temperatura · Lluvia", color: "text-orange-500", bg: "bg-orange-500/10" },
                { icon: BarChart3, title: "Estadísticas", desc: "Análisis en tiempo real", color: "text-purple-500", bg: "bg-purple-500/10" },
                { icon: Shield, title: "Panel Admin", desc: "Gestión y aprobación", color: "text-cyan-500", bg: "bg-cyan-500/10" },
              ].map(({ icon: Icon, title, desc, color, bg }, i) => (
                <motion.div
                  key={title}
                  variants={fadeUp}
                  custom={i}
                  className={`rounded-xl border border-border/60 bg-card/80 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${i === 2 ? "col-span-2 sm:col-span-1" : ""}`}
                  style={{ boxShadow: "var(--shadow-sm)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)"}
                >
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <p className="font-semibold text-sm text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA inferior — dos audiencias */}
      <section className="border-t border-border/50 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <TreePine className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg">Para Agricultores</h3>
              <p className="text-sm text-muted-foreground">Registre su predio con la ayuda de un asesor. Rápido, seguro y desde cualquier dispositivo.</p>
              <Button asChild className="w-full gap-2 min-h-[44px]">
                <Link href="/formulario">
                  Completar Formulario
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 p-6 space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                <Users className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="font-semibold text-lg">Para Asesores</h3>
              <p className="text-sm text-muted-foreground">Acceda a su panel de campo, registre visitas y sincronice caracterizaciones offline.</p>
              <Button asChild variant="outline" className="w-full gap-2 min-h-[44px] bg-transparent">
                <Link href="/auth/login">
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 p-6 space-y-3 sm:col-span-2 md:col-span-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                <Shield className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="font-semibold text-lg">Para Administradores</h3>
              <p className="text-sm text-muted-foreground">Revise caracterizaciones, gestione usuarios y apruebe solicitudes con herramientas NDVI.</p>
              <Button asChild variant="outline" className="w-full gap-2 min-h-[44px] bg-transparent">
                <Link href="/admin">
                  Panel Admin
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/20">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Image src="/icons/icon-192x192.png" alt="Santander Agro360" width={24} height={24} className="rounded-lg" />
              <span className="text-sm font-semibold">Santander Agro360</span>
              <span className="text-xs text-muted-foreground">— Santander, Colombia</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/auth/login" className="hover:text-foreground transition-colors">Asesores</Link>
              <Link href="/registro" className="hover:text-foreground transition-colors">Registro</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
