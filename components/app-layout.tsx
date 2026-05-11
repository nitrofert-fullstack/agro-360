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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
    { href: "/mapa", label: "Mapa de Predios", icon: Map },
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
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Sidebar abre por defecto — el SidebarProvider maneja su propio estado persistido
  // No leer cookie aquí para evitar hydration mismatch server/client
  const defaultSidebarOpen = true

  const rol = profile?.rol ?? "asesor"
  const navItems = navByRole[rol] ?? navByRole.asesor
  const firstName = profile?.nombre_completo?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "Usuario"

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await fetch("/auth/signout", { method: "POST" })
    window.location.href = "/auth/login"
  }

  return (
    <>
      <SidebarProvider className="h-svh overflow-hidden" defaultOpen={defaultSidebarOpen}>
        <Sidebar variant="inset" collapsible="icon">
          {/* Logo + toggle */}
          <SidebarHeader className="p-3">
            {/* Expandido: logo + trigger */}
            <div className="flex items-center justify-between group-data-[collapsible=icon]:hidden">
              <Link href="/dashboard" className="flex items-center justify-center">
                <Image
                  src="/icons/icon-192x192.png"
                  alt="Santander Agro360"
                  width={32}
                  height={32}
                  className="rounded-xl"
                />
              </Link>
              <SidebarTrigger className="hidden md:flex" />
            </div>
            {/* Colapsado: solo trigger centrado */}
            <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center">
              <SidebarTrigger />
            </div>
          </SidebarHeader>

          <Separator />

          {/* Nav items */}
          <SidebarContent className="pt-2">
            <SidebarMenu className="group-data-[collapsible=icon]:[&>li]:flex group-data-[collapsible=icon]:[&>li]:justify-center">
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
            <Separator className="mb-1" />
            <SidebarMenu className="group-data-[collapsible=icon]:[&>li]:flex group-data-[collapsible=icon]:[&>li]:justify-center">
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Mi Cuenta" isActive={pathname === "/settings" || pathname === "/profile"}>
                  <Link href="/settings">
                    <User className="h-4 w-4 shrink-0" />
                    <span className="truncate">{firstName}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setShowLogoutModal(true)}
                  disabled={isSigningOut}
                  tooltip="Cerrar sesión"
                  className="text-muted-foreground hover:text-destructive"
                >
                  {isSigningOut
                    ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    : <LogOut className="h-4 w-4 shrink-0" />
                  }
                  <span>Cerrar sesión</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            {/* ThemeToggle */}
            <div className="flex items-center justify-between px-2 py-1 group-data-[collapsible=icon]:justify-center">
              <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Tema</span>
              <ThemeToggle />
            </div>

            {profile?.rol && (
              <div className="px-2 group-data-[collapsible=icon]:hidden">
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
          <header className="shrink-0 flex h-14 items-center gap-2 border-b border-border/40 bg-background/95 backdrop-blur-md px-3 md:hidden">
            <SidebarTrigger className="h-10 w-10 shrink-0" />
            <Image
              src="/icons/icon-192x192.png"
              alt="Santander Agro360"
              width={28}
              height={28}
              className="rounded-lg shrink-0"
            />
            <span className="font-semibold text-sm truncate">Agro360</span>
            <div className="ml-auto shrink-0">
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 flex flex-col overflow-hidden p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>

      {/* Modal confirmación logout */}
      <AlertDialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Se cerrará tu sesión en este dispositivo. Podrás volver a ingresar con tus credenciales.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSigningOut}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSigningOut}
              onClick={handleSignOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sí, cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
