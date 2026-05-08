"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard,
  FileText,
  Map,
  Users,
  BarChart3,
  Plus,
  LogOut,
  User,
  Settings,
  Home,
  Loader2,
} from "lucide-react"

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
}

const navByRole: Record<string, NavItem[]> = {
  asesor: [
    { href: "/dashboard", label: "Mis Registros", icon: LayoutDashboard },
    { href: "/formulario", label: "Nueva Caracterización", icon: Plus },
    { href: "/mapa", label: "Mapa NDVI", icon: Map },
  ],
  admin: [
    { href: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3 },
    { href: "/admin/caracterizaciones", label: "Caracterizaciones", icon: FileText },
    { href: "/admin/usuarios", label: "Usuarios", icon: Users },
    { href: "/admin/mapa", label: "Mapa", icon: Map },
  ],
  analista: [
    { href: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3 },
    { href: "/admin/caracterizaciones", label: "Caracterizaciones", icon: FileText },
    { href: "/admin/mapa", label: "Mapa", icon: Map },
  ],
  agricultor: [
    { href: "/dashboard", label: "Mi Predio", icon: Home },
  ],
  campesino: [
    { href: "/dashboard", label: "Mi Predio", icon: Home },
  ],
}

const rolLabels: Record<string, string> = {
  asesor: "Asesor de campo",
  admin: "Administrador",
  analista: "Analista",
  agricultor: "Agricultor",
  campesino: "Productor",
}

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, user } = useAuth()
  const pathname = usePathname()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const rol = profile?.rol ?? "asesor"
  const navItems = navByRole[rol] ?? navByRole.asesor
  const firstName = profile?.nombre_completo?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "Usuario"

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    await fetch("/auth/signout", { method: "POST" })
    window.location.href = "/auth/login"
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <Sidebar variant="inset" collapsible="icon">
        {/* Logo */}
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <Image
              src="/icons/icon-192x192.png"
              alt="Santander Agro360"
              width={36}
              height={36}
              className="rounded-xl shrink-0"
            />
            <span className="font-display font-bold text-sm leading-tight group-data-[collapsible=icon]:hidden">
              Santander<br />Agro360
            </span>
          </Link>
        </SidebarHeader>

        <Separator className="mx-4 w-auto" />

        {/* Nav items */}
        <SidebarContent className="pt-2">
          <SidebarMenu>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                    <Link href={item.href}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="p-3 space-y-1">
          <Separator className="mb-2" />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Perfil" isActive={pathname === "/profile"}>
                <Link href="/profile">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="truncate">{firstName}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Configuración" isActive={pathname === "/settings"}>
                <Link href="/settings">
                  <Settings className="h-4 w-4 shrink-0" />
                  <span>Configuración</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleSignOut}
                disabled={isSigningOut}
                tooltip="Cerrar sesión"
                className="text-muted-foreground hover:text-destructive"
              >
                {isSigningOut
                  ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  : <LogOut className="h-4 w-4 shrink-0" />
                }
                <span>{isSigningOut ? "Saliendo…" : "Cerrar sesión"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {profile?.rol && (
            <div className="px-2 pt-1 group-data-[collapsible=icon]:hidden">
              <Badge variant="outline" className="w-full justify-center text-xs bg-primary/8 text-primary border-primary/20">
                {rolLabels[profile.rol] ?? profile.rol}
              </Badge>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      {/* Main content area */}
      <SidebarInset className="overflow-hidden">
        {/* Topbar mobile */}
        <header className="shrink-0 flex h-14 items-center gap-3 border-b border-border/40 bg-background/95 backdrop-blur-md px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Image
            src="/icons/icon-192x192.png"
            alt="Santander Agro360"
            width={28}
            height={28}
            className="rounded-lg"
          />
          <span className="font-display font-semibold text-sm">Agro360</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        {/* ThemeToggle desktop */}
        <div className="absolute top-3 right-4 z-40 hidden md:block">
          <ThemeToggle />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
