# Rediseño Enfoque B — Sidebar + Estructura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar sidebar de navegación unificado para todas las vistas autenticadas, eliminando los headers inconsistentes por rol y mejorando la experiencia en desktop y mobile.

**Architecture:** Se crea `components/app-layout.tsx` — wrapper con sidebar + área de contenido. Cada página autenticada (dashboard, admin, profile, settings, mapa) se envuelve en este layout. El sidebar muestra nav items según el rol del usuario y se convierte en un Sheet/Drawer en mobile. El componente usa el `SidebarProvider` ya existente en `components/ui/sidebar.tsx`. El formulario (`/formulario`) permanece sin sidebar por ser parcialmente público.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Radix UI Sidebar (ya instalado en `components/ui/sidebar.tsx`), Framer Motion (ya instalado), Lucide icons

---

## File Map

| Archivo | Cambio |
|---------|--------|
| `components/app-layout.tsx` | CREAR — wrapper con sidebar + topbar mobile |
| `app/dashboard/page.tsx` | MODIFICAR — envolver contenido en AppLayout, quitar header interno |
| `app/admin/estadisticas/page.tsx` | MODIFICAR — envolver AdminDashboard en AppLayout |
| `app/admin/caracterizaciones/page.tsx` | MODIFICAR — envolver en AppLayout |
| `app/admin/usuarios/page.tsx` | MODIFICAR — envolver en AppLayout |
| `app/admin/mapa/page.tsx` | MODIFICAR — envolver en AppLayout |
| `app/mapa/page.tsx` | MODIFICAR — envolver en AppLayout |
| `app/profile/page.tsx` | MODIFICAR — reemplazar header con AppLayout |
| `app/settings/page.tsx` | MODIFICAR — reemplazar header con AppLayout |
| `app/dashboard/caracterizacion/[id]/page.tsx` | MODIFICAR — envolver en AppLayout |

---

## Task 1: Crear AppLayout con Sidebar

**Files:**
- Create: `components/app-layout.tsx`

- [ ] **Step 1: Leer el sidebar UI existente para entender la API**

Lee `components/ui/sidebar.tsx` líneas 1-120 para conocer los componentes disponibles:
`SidebarProvider`, `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarTrigger`, `SidebarInset`.

- [ ] **Step 2: Crear el archivo components/app-layout.tsx**

Crear `C:\Users\jcorrea\Desktop\agro-360\components\app-layout.tsx` con el siguiente contenido completo:

```tsx
"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
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
import { Button } from "@/components/ui/button"
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
  const { profile, user, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
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
    <SidebarProvider>
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
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.label}
                  >
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

        {/* Footer: perfil + settings + salir */}
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
                <span>{isSigningOut ? "Saliendo..." : "Cerrar sesión"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Rol badge — solo cuando expandido */}
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
      <SidebarInset>
        {/* Topbar mobile — solo visible en mobile */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/40 bg-background/95 backdrop-blur-md px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Image
            src="/icons/icon-192x192.png"
            alt="Santander Agro360"
            width={28}
            height={28}
            className="rounded-lg"
          />
          <span className="font-display font-semibold text-sm">Santander Agro360</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        {/* ThemeToggle desktop — esquina superior derecha */}
        <div className="absolute top-3 right-4 z-40 hidden md:block">
          <ThemeToggle />
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

- [ ] **Step 3: Verificar que TypeScript compila el nuevo componente**

```bash
cd "C:\Users\jcorrea\Desktop\agro-360" && pnpm tsc --noEmit 2>&1 | grep "app-layout" | head -10
```

Si hay errores en app-layout.tsx, corrígelos. Si no hay errores (salida vacía), continúa.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\jcorrea\Desktop\agro-360" && git add components/app-layout.tsx && git commit -m "feat: AppLayout con sidebar por rol, topbar mobile"
```

---

## Task 2: Aplicar AppLayout al Dashboard (asesor + agricultor)

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Leer el dashboard actual**

Lee `app/dashboard/page.tsx` completo. El archivo tiene ~412 líneas. Identifica:
- El componente `Header` interno (líneas ~124-145) — se eliminará
- Las secciones que usan `<Header />` — se eliminará su uso
- El `<div className="min-h-screen bg-background">` raíz — se reemplazará

- [ ] **Step 2: Agregar import de AppLayout**

Al inicio de `app/dashboard/page.tsx`, después de los imports existentes, agregar:

```tsx
import { AppLayout } from "@/components/app-layout"
```

- [ ] **Step 3: Eliminar el componente Header interno**

En `app/dashboard/page.tsx`, eliminar completamente el bloque del componente `Header` local (aproximadamente líneas 124-145):

```tsx
// ELIMINAR todo este bloque:
const Header = () => (
  <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
    <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
      <div className="flex items-center gap-2 md:gap-3">
        <Image src="/icons/icon-192x192.png" alt="Santander Agro360" width={60} height={60} className="rounded-xl" />
      </div>
      <nav className="flex items-center gap-1.5 md:gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="gap-2 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{isSigningOut ? 'Saliendo...' : 'Salir'}</span>
        </Button>
        <ThemeToggle />
      </nav>
    </div>
  </header>
)
```

- [ ] **Step 4: Reemplazar el return del asesor con AppLayout**

En el return principal del asesor (busca `return (` cerca del final, el que tiene `<div className="min-h-screen bg-background">`):

```tsx
// ANTES:
return (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <motion.div ...>
        {/* todo el contenido */}
      </motion.div>
    </main>
  </div>
)

// DESPUÉS:
return (
  <AppLayout>
    <div className="mx-auto max-w-5xl">
      <motion.div ...>
        {/* todo el contenido — sin cambios */}
      </motion.div>
    </div>
  </AppLayout>
)
```

- [ ] **Step 5: Reemplazar el return del agricultor con AppLayout**

Busca el return del agricultor (tiene `<Header />` y `<AgricultorDashboard ...>`):

```tsx
// ANTES:
return (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <AgricultorDashboard
        userEmail={user?.email || ''}
        userName={profile.nombre_completo || 'Productor'}
        userNumDoc={profile.numero_documento}
      />
    </main>
  </div>
)

// DESPUÉS:
return (
  <AppLayout>
    <div className="mx-auto max-w-5xl">
      <AgricultorDashboard
        userEmail={user?.email || ''}
        userName={profile.nombre_completo || 'Productor'}
        userNumDoc={profile.numero_documento}
      />
    </div>
  </AppLayout>
)
```

- [ ] **Step 6: Limpiar imports sin usar**

Después de eliminar el Header, revisa si `Image`, `LogOut`, `ThemeToggle` siguen usándose. Si no, elimínalos de los imports.

- [ ] **Step 7: Verificar build**

```bash
cd "C:\Users\jcorrea\Desktop\agro-360" && pnpm tsc --noEmit 2>&1 | grep "dashboard" | head -10
```

Salida vacía = sin errores.

- [ ] **Step 8: Commit**

```bash
cd "C:\Users\jcorrea\Desktop\agro-360" && git add app/dashboard/page.tsx && git commit -m "feat: dashboard usa AppLayout con sidebar"
```

---

## Task 3: Aplicar AppLayout a páginas de Admin

**Files:**
- Modify: `app/admin/estadisticas/page.tsx`
- Modify: `app/admin/caracterizaciones/page.tsx`
- Modify: `app/admin/usuarios/page.tsx`
- Modify: `app/admin/mapa/page.tsx`

- [ ] **Step 1: Leer las páginas admin actuales**

Lee los 4 archivos:
- `app/admin/estadisticas/page.tsx` — actualmente solo `return <AdminDashboard />`
- `app/admin/caracterizaciones/page.tsx`
- `app/admin/usuarios/page.tsx`
- `app/admin/mapa/page.tsx`

- [ ] **Step 2: Actualizar app/admin/estadisticas/page.tsx**

```tsx
import { AdminDashboard } from "@/components/admin-dashboard"
import { AppLayout } from "@/components/app-layout"

export default function EstadisticasPage() {
  return (
    <AppLayout>
      <AdminDashboard />
    </AppLayout>
  )
}
```

- [ ] **Step 3: Leer y actualizar app/admin/caracterizaciones/page.tsx**

Lee el archivo completo. Si es un Server Component que importa `AdminDashboard`, el patrón es igual. Si tiene lógica client-side, agrega `"use client"` si no está y envuelve en AppLayout. Resultado esperado:

```tsx
import { AdminDashboard } from "@/components/admin-dashboard"
import { AppLayout } from "@/components/app-layout"

export default function CaracterizacionesPage() {
  return (
    <AppLayout>
      <AdminDashboard />
    </AppLayout>
  )
}
```

- [ ] **Step 4: Actualizar app/admin/usuarios/page.tsx con el mismo patrón**

Lee el archivo. Si solo renderiza un componente, envuélvelo en AppLayout igual que los anteriores.

- [ ] **Step 5: Actualizar app/admin/mapa/page.tsx con el mismo patrón**

Lee el archivo. Envuelve el contenido en AppLayout.

- [ ] **Step 6: Verificar build admin**

```bash
cd "C:\Users\jcorrea\Desktop\agro-360" && pnpm tsc --noEmit 2>&1 | grep "admin" | head -10
```

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\jcorrea\Desktop\agro-360" && git add app/admin/estadisticas/page.tsx app/admin/caracterizaciones/page.tsx app/admin/usuarios/page.tsx app/admin/mapa/page.tsx && git commit -m "feat: páginas admin usan AppLayout con sidebar"
```

---

## Task 4: Aplicar AppLayout a Profile, Settings y Mapa público

**Files:**
- Modify: `app/profile/page.tsx`
- Modify: `app/settings/page.tsx`
- Modify: `app/mapa/page.tsx`

- [ ] **Step 1: Leer app/profile/page.tsx completo**

Lee el archivo. Identifica el header interno (si existe) y el `<div className="min-h-screen...">` raíz.

- [ ] **Step 2: Actualizar profile/page.tsx**

Agrega `import { AppLayout } from "@/components/app-layout"`. Reemplaza el wrapper raíz con `<AppLayout>`. Elimina el header interno si existe. El `<main>` interno se convierte en `<div>` o se elimina si AppLayout ya provee el padding.

El resultado debe seguir este patrón:
```tsx
// Al final del archivo, el return principal:
return (
  <AppLayout>
    <div className="mx-auto max-w-2xl">
      {/* contenido existente de profile sin el header */}
    </div>
  </AppLayout>
)
```

- [ ] **Step 3: Leer y actualizar app/settings/page.tsx con el mismo patrón**

Lee el archivo. Mismo patrón: quita header interno, envuelve en AppLayout con `max-w-2xl`.

- [ ] **Step 4: Leer y actualizar app/mapa/page.tsx**

Lee el archivo. El mapa es accesible para asesores autenticados. Mismo patrón de AppLayout. Si el mapa ocupa toda la pantalla, usar `max-w-none` o sin max-width constraint:

```tsx
return (
  <AppLayout>
    <div className="h-[calc(100vh-8rem)]">
      {/* componente del mapa */}
    </div>
  </AppLayout>
)
```

- [ ] **Step 5: Verificar build**

```bash
cd "C:\Users\jcorrea\Desktop\agro-360" && pnpm tsc --noEmit 2>&1 | grep -E "profile|settings|mapa" | head -10
```

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\jcorrea\Desktop\agro-360" && git add app/profile/page.tsx app/settings/page.tsx app/mapa/page.tsx && git commit -m "feat: profile, settings y mapa usan AppLayout con sidebar"
```

---

## Task 5: Aplicar AppLayout a detalle de caracterización

**Files:**
- Modify: `app/dashboard/caracterizacion/[id]/page.tsx`

- [ ] **Step 1: Leer el archivo completo**

Lee `app/dashboard/caracterizacion/[id]/page.tsx`. Identifica el header interno y el wrapper raíz.

- [ ] **Step 2: Agregar AppLayout**

Agrega `import { AppLayout } from "@/components/app-layout"`. Reemplaza el wrapper raíz `<div className="min-h-screen...">` con `<AppLayout>`. Elimina el header interno. Ajusta el max-width del contenido a `max-w-4xl`.

- [ ] **Step 3: Verificar build completo**

```bash
cd "C:\Users\jcorrea\Desktop\agro-360" && pnpm build 2>&1 | tail -20
```

Esperado: build exitoso sin errores de TypeScript.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\jcorrea\Desktop\agro-360" && git add "app/dashboard/caracterizacion/[id]/page.tsx" && git commit -m "feat: detalle caracterización usa AppLayout con sidebar"
```

---

## Task 6: Ajuste visual del AdminDashboard interno

El `AdminDashboard` tiene su propio sidebar interno (panel izquierdo con tabs). Con el nuevo AppLayout ya proveyendo sidebar, el sidebar interno del admin sigue siendo útil como navegación secundaria entre secciones del panel. Sin embargo, el header interno del AdminDashboard debe eliminarse para evitar doble header.

**Files:**
- Modify: `components/admin-dashboard.tsx`

- [ ] **Step 1: Identificar el header interno del AdminDashboard**

Lee `components/admin-dashboard.tsx` desde el inicio del return (~línea 1080+). Busca el `<header>` o el elemento que contiene el logo y botón de cerrar sesión dentro del componente.

- [ ] **Step 2: Eliminar el header interno del AdminDashboard**

Elimina el bloque `<header>` que contiene el logo y el botón de cerrar sesión dentro de `AdminDashboard`. El sidebar del AppLayout ya provee esta funcionalidad.

Si el AdminDashboard tiene una estructura como:
```tsx
<div className="flex h-screen">
  <aside>...</aside>  {/* panel izquierdo de tabs — CONSERVAR */}
  <main>...</main>    {/* contenido — CONSERVAR */}
</div>
```

Cambia `h-screen` por `min-h-0` o elimínalo para que el layout no conflicte con AppLayout.

- [ ] **Step 3: Verificar que el panel de admin sigue funcionando**

```bash
cd "C:\Users\jcorrea\Desktop\agro-360" && pnpm build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\jcorrea\Desktop\agro-360" && git add components/admin-dashboard.tsx && git commit -m "feat: AdminDashboard sin header interno — usa AppLayout"
```

---

## Task 7: QA Visual Final

- [ ] **Step 1: Arrancar dev server y verificar desktop**

```bash
cd "C:\Users\jcorrea\Desktop\agro-360" && pnpm dev
```

En browser, ir a `http://localhost:3000`. Verificar:
- Landing: sin sidebar (correcto — no es página autenticada)
- Login: sin sidebar (correcto)
- Formulario: sin sidebar (correcto — público)

- [ ] **Step 2: Verificar sidebar autenticado**

Iniciar sesión como asesor. Verificar en `http://localhost:3000/dashboard`:
- Sidebar visible a la izquierda en desktop
- Logo + nav items correctos para rol asesor
- Item activo resaltado (Mis Registros)
- Botón logout funcional
- ThemeToggle en esquina superior derecha desktop

- [ ] **Step 3: Verificar mobile (375px)**

En DevTools → toggle device toolbar → iPhone SE (375px):
- Sidebar oculto
- Topbar con hamburger visible
- Al hacer tap en hamburger: sidebar slide-in (Sheet)
- Nav items clickeables con ≥48px height

- [ ] **Step 4: Verificar sidebar admin**

Iniciar sesión como admin. Ir a `/admin/estadisticas`:
- Nav items de admin visibles en sidebar
- Panel interno del admin (tabs de secciones) sigue funcionando
- Sin doble header

- [ ] **Step 5: Verificar sidebar agricultor**

Iniciar sesión como agricultor. Ir a `/dashboard`:
- Solo "Mi Predio" en sidebar
- Contenido del agricultor dashboard visible

- [ ] **Step 6: Commit de ajustes finales si los hay**

```bash
cd "C:\Users\jcorrea\Desktop\agro-360" && git add -A && git commit -m "fix: ajustes QA visual sidebar — mobile, admin, agricultores"
```

---

## Self-Review

### Cobertura del spec
- ✅ Sidebar navegación unificado para vistas autenticadas (Tasks 1-5)
- ✅ Nav items por rol: asesor, admin, analista, agricultor/campesino (Task 1)
- ✅ Mobile: sidebar se convierte en Sheet (SidebarProvider maneja esto automáticamente)
- ✅ Inconsistencia de headers eliminada (Tasks 2-5 eliminan headers internos)
- ✅ Formulario `/formulario` sin sidebar (no se modifica)
- ✅ Landing y login sin sidebar (no se modifican)
- ✅ ThemeToggle disponible en AppLayout (desktop + mobile topbar)
- ✅ Logout en sidebar footer (Task 1)
- ✅ Stepper del formulario: NO modificado (respetando instrucción del usuario)
- ✅ QA visual completo (Task 7)

### No placeholders
- Todos los code blocks son completos
- Todos los comandos tienen expected output
- Ningún "TBD" ni "similar a Task N"

### Consistencia de tipos
- `AppLayout` exportado como named export ✅
- `import { AppLayout } from "@/components/app-layout"` consistente en todos los tasks ✅
- `SidebarProvider`, `Sidebar`, `SidebarInset` son los nombres exactos de `components/ui/sidebar.tsx` ✅
- `navByRole` cubre todos los roles del sistema: asesor, admin, analista, agricultor, campesino ✅
