"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/hooks/use-auth"
import {
  MapPin, FileText, Shield, BarChart3, Users, ArrowRight,
  Mountain, LogIn, LayoutDashboard, Satellite,
  TreePine, ClipboardCheck
} from "lucide-react"

// Tailwind no compila clases dinámicas (`bg-${color}-500/10`) — mapa estático
const ICON_COLORS: Record<string, { bg: string; text: string }> = {
  green:  { bg: "bg-green-500/10",  text: "text-green-500" },
  blue:   { bg: "bg-blue-500/10",   text: "text-blue-500" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-500" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-500" },
  cyan:   { bg: "bg-cyan-500/10",   text: "text-cyan-500" },
  red:    { bg: "bg-red-500/10",    text: "text-red-500" },
}

/** Reveal below-the-fold: IntersectionObserver añade .in-view → CSS transition.
 *  Sin framer-motion: el JS es ~10 líneas y no bloquea el render inicial. */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in-view")
          io.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  )
}

export default function Home() {
  const { isAuthenticated, loading } = useAuth()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Image src="/icons/icon-192x192.png" alt="Santander Agro360" width={36} height={36} className="rounded-xl" priority />
            <span className="font-semibold text-sm hidden sm:block">Santander Agro360</span>
          </div>
          <nav className="flex items-center gap-2">
            {mounted && !loading && (
              isAuthenticated ? (
                <Button asChild size="sm" className="gap-2 h-9">
                  <Link href="/dashboard"><LayoutDashboard className="h-4 w-4" /><span className="hidden sm:inline">Dashboard</span></Link>
                </Button>
              ) : (
                <Button asChild size="sm" className="gap-2 h-9">
                  <Link href="/auth/login"><LogIn className="h-4 w-4" /><span className="hidden sm:inline">Iniciar sesión</span></Link>
                </Button>
              )
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main>
      {/* Hero — full width centrado */}
      <section className="relative overflow-hidden">
        {/* Fondos decorativos */}
        <div className="pointer-events-none absolute inset-0">
          {/* Gradiente radial */}
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[700px] w-[700px] rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-primary/5 blur-3xl" />

          {/* Líneas topográficas: verdes + blancas/neutras alternadas */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
            <defs>
              {/* Patrón verde — líneas primarias */}
              <pattern id="topo-green" x="0" y="0" width="160" height="160" patternUnits="userSpaceOnUse">
                <path d="M-20 80 Q20 55 60 80 Q100 105 140 80 Q180 55 220 80" fill="none" stroke="oklch(0.45 0.18 145)" strokeWidth="1" opacity="0.18"/>
                <path d="M-20 120 Q20 95 60 120 Q100 145 140 120 Q180 95 220 120" fill="none" stroke="oklch(0.45 0.18 145)" strokeWidth="1" opacity="0.12"/>
              </pattern>
              {/* Patrón neutro — líneas secundarias */}
              <pattern id="topo-neutral" x="40" y="40" width="160" height="160" patternUnits="userSpaceOnUse">
                <path d="M-20 40 Q20 18 60 40 Q100 62 140 40 Q180 18 220 40" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.07"/>
                <path d="M-20 100 Q20 78 60 100 Q100 122 140 100 Q180 78 220 100" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.07"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#topo-green)"/>
            <rect width="100%" height="100%" fill="url(#topo-neutral)"/>
          </svg>
        </div>

        {/* Contenido hero — animación CSS pura: pinta sin esperar hidratación */}
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center md:px-8 md:py-28">
          <div className="flex flex-col items-center gap-6">

            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-widest">
                <MapPin className="h-3 w-3" />
                Santander, Colombia
              </span>
            </div>

            {/* LCP: solo transform (sin fade) — un LCP que nace con opacity:0
                no registra candidato en Chrome y la métrica se corre al siguiente paint */}
            <h1 className="animate-slide-up max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Caracterización
              <br />
              <span className="bg-gradient-to-r from-primary via-primary/90 to-emerald-600 bg-clip-text text-transparent">
                Predial
              </span>
              {" "}Inteligente
            </h1>

            <p className="animate-fade-up max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl leading-relaxed" style={{ animationDelay: "160ms" }}>
              Plataforma digital para el registro, análisis y monitoreo de predios agrícolas en Santander.
              Tecnología satelital NDVI, geolocalización precisa y gestión administrativa centralizada.
            </p>

            <div className="animate-fade-up flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "240ms" }}>
              <Button asChild size="lg" className="gap-2 min-h-[52px] px-8 text-base shadow-lg">
                <Link href="/formulario">
                  <ClipboardCheck className="h-5 w-5" />
                  Iniciar Caracterización
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2 min-h-[52px] px-8 text-base bg-transparent">
                <Link href="/registro">
                  <Users className="h-5 w-5" />
                  Crear cuenta
                </Link>
              </Button>
            </div>

            {/* Stats strip */}
            <div className="animate-fade-up flex flex-wrap items-center justify-center gap-8 pt-6 border-t border-border/40 w-full max-w-lg" style={{ animationDelay: "320ms" }}>
              {[
                { value: "87", label: "Municipios cubiertos" },
                { value: "NDVI", label: "Monitoreo satelital" },
                { value: "100%", label: "Digital y offline" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="relative border-t border-border/40 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <Reveal className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Funcionalidades principales</h2>
            <p className="mt-3 text-muted-foreground">Herramientas diseñadas para el sector agropecuario de Santander</p>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Satellite, color: "green", title: "Índice NDVI", desc: "Monitoreo de vegetación en tiempo real con datos satelitales NASA MODIS.", body: "Visualiza la salud de los cultivos con mapas coloreados que muestran desde zonas áridas hasta vegetación densa." },
              { icon: Mountain, color: "blue", title: "Capas Climáticas", desc: "Temperatura y precipitación actualizadas con datos meteorológicos en tiempo real.", body: "Analiza las condiciones climáticas de cada predio para tomar decisiones informadas sobre cultivos y riesgos." },
              { icon: FileText, color: "purple", title: "Caracterización Digital", desc: "Formulario completo de 9 secciones basado en estándares del sector.", body: "Registra información del productor, predio, producción y aspectos financieros de forma estructurada." },
              { icon: MapPin, color: "orange", title: "Geolocalización", desc: "Marca puntos o dibuja polígonos para delimitar predios con precisión.", body: "Herramientas interactivas para definir con exactitud los límites de cada predio agrícola." },
              { icon: BarChart3, color: "cyan", title: "Análisis Estadístico", desc: "Cálculo automático de áreas, perímetros y estadísticas del sistema.", body: "Obtén métricas precisas por municipio, asesor y estado de las caracterizaciones." },
              { icon: Shield, color: "red", title: "Gestión Administrativa", desc: "Panel completo para revisión, aprobación y seguimiento de solicitudes.", body: "Administradores y analistas pueden revisar, aprobar o escalar caracterizaciones con trazabilidad." },
            ].map(({ icon: Icon, color, title, desc, body }, i) => (
              <Reveal key={title} delay={i * 60}>
                <div className="h-full rounded-xl border border-border/60 bg-card/80 p-5 backdrop-blur-sm shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-md">
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${ICON_COLORS[color].bg}`}>
                    <Icon className={`h-5 w-5 ${ICON_COLORS[color].text}`} aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-base text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-primary/80 font-medium mb-2">{desc}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — tres audiencias */}
      <section className="border-t border-border/40 bg-muted/20 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[
              {
                icon: TreePine,
                iconBg: "bg-primary",
                iconColor: "text-primary-foreground",
                border: "border-primary/20",
                bg: "bg-primary/5",
                title: "Para Agricultores",
                desc: "Registre su predio con la ayuda de un asesor. Rápido, seguro y desde cualquier dispositivo.",
                cta: "Completar Formulario",
                href: "/formulario",
                variant: "default" as const,
              },
              {
                icon: Users,
                iconBg: "bg-secondary",
                iconColor: "text-secondary-foreground",
                border: "border-border/60",
                bg: "bg-card/80",
                title: "Para Asesores",
                desc: "Acceda a su panel de campo, registre visitas y sincronice caracterizaciones.",
                cta: "Iniciar sesión",
                href: "/auth/login",
                variant: "outline" as const,
              },
              {
                icon: Shield,
                iconBg: "bg-secondary",
                iconColor: "text-secondary-foreground",
                border: "border-border/60",
                bg: "bg-card/80",
                title: "Para Administradores",
                desc: "Revise caracterizaciones, gestione usuarios y apruebe solicitudes con herramientas NDVI.",
                cta: "Panel Admin",
                href: "/admin",
                variant: "outline" as const,
              },
            ].map(({ icon: Icon, iconBg, iconColor, border, bg, title, desc, cta, href, variant }, i) => (
              <Reveal key={title} delay={i * 60}>
                <div className={`h-full rounded-2xl border ${border} ${bg} p-6 space-y-4`}>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                  </div>
                  <Button asChild variant={variant} className={`w-full gap-2 min-h-[44px] ${variant === "outline" ? "bg-transparent" : ""}`}>
                    <Link href={href}>{cta}<ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      </main>

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
