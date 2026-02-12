"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Home } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

const MapViewer = dynamic(
  () => import("@/components/map-viewer").then((mod) => mod.MapViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Cargando mapa...</span>
        </div>
      </div>
    ),
  }
)

export default function MapaPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <main className="relative h-screen w-screen overflow-hidden bg-background">
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Cargando mapa...</span>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      <MapViewer />
      
      {/* Navigation controls - Bottom left, far from coordinates */}
      <div className="absolute bottom-3 left-3 z-[1002] flex items-center gap-2 md:bottom-4">
        <Link 
          href="/"
          className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card/95 px-2.5 text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-secondary hover:text-foreground md:h-9 md:gap-2 md:px-3"
          aria-label="Volver al Inicio"
        >
          <Home className="h-4 w-4" />
          <span className="hidden text-xs font-medium sm:inline md:text-sm">Inicio</span>
        </Link>
        <ThemeToggle />
      </div>
    </main>
  )
}
