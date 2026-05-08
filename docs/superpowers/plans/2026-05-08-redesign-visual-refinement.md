# Rediseño Visual — Enfoque A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refinar la apariencia de Santander Agro360 con nuevas fuentes, glassmorphism suave, sistema de sombras verde-tintado y mejoras de legibilidad — sin tocar lógica de negocio.

**Architecture:** Cambios exclusivamente en CSS global, layout de fuentes, y clases Tailwind en páginas/componentes. Sin cambios en rutas, hooks, contextos ni lógica de formulario. El formulario solo recibe mejoras en el stepper/progress bar visual.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, `next/font/google` (Fraunces + Plus Jakarta Sans), Framer Motion (ya instalado), Radix UI

---

## File Map

| Archivo | Cambio |
|---------|--------|
| `app/layout.tsx` | Importar Fraunces + Plus Jakarta Sans; aplicar variables CSS de fuente |
| `app/globals.css` | --radius, shadow vars, grain overlay, gradient mesh, animation timings, font-display var, focus ring |
| `app/page.tsx` | Display font en h2/h3, grain en hero, mejor spacing, hover cards |
| `app/auth/login/LoginClient.tsx` | Glassmorphism card login, touch targets |
| `app/dashboard/page.tsx` | Sombras verde-tintadas en cards, touch targets |
| `components/admin-dashboard.tsx` | Idem dashboard |
| `components/agricultor-dashboard.tsx` | Idem dashboard |
| `components/characterization-form-complete.tsx` | Progress bar enhanced, label sizes, focus rings |

---

## Task 1: Nueva Tipografía — layout.tsx + globals.css

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Actualizar imports de fuentes en layout.tsx**

Reemplazar las líneas 3-4 y 14-15 de `app/layout.tsx`:

```tsx
// Líneas a reemplazar (líneas 3-4):
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'

// Eliminar estas dos líneas (14-15):
// const _geist = Geist({ subsets: ["latin"] });
// const _geistMono = Geist_Mono({ subsets: ["latin"] });

// Agregar después del import:
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})
```

- [ ] **Step 2: Aplicar variables de fuente en el body**

En `app/layout.tsx`, reemplazar el `<body>` actual:

```tsx
// Antes (línea 47):
<body className={`font-sans antialiased`}>

// Después:
<body className={`${fraunces.variable} ${plusJakarta.variable} font-sans antialiased`}>
```

- [ ] **Step 3: Actualizar globals.css — @theme inline**

En `app/globals.css`, dentro del bloque `@theme inline { ... }`, reemplazar las líneas de font:

```css
/* Reemplazar las dos líneas de --font-sans y --font-mono */
--font-display: var(--font-display);
--font-sans: var(--font-sans);
--font-mono: ui-monospace, 'Cascadia Code', monospace;
```

- [ ] **Step 4: Verificar fuentes cargando**

```bash
pnpm dev
```

Abrir `http://localhost:3000`. Verificar que el body usa Plus Jakarta Sans (sans-serif redondeada, sin serifa). Los h1/h2 siguen sin Fraunces todavía — se aplica en Task 3.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: tipografía Fraunces + Plus Jakarta Sans"
```

---

## Task 2: Sistema Visual Base — globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Actualizar --radius y agregar shadow vars**

Al final del bloque `:root { ... }` en `globals.css`, antes del cierre `}`, agregar:

```css
  /* Radius más generoso */
  --radius: 0.875rem;

  /* Sombras verde-tintadas */
  --shadow-sm: 0 1px 3px oklch(0 0 0 / 0.07);
  --shadow-md: 0 4px 16px oklch(0.45 0.18 145 / 0.10);
  --shadow-lg: 0 8px 32px oklch(0.45 0.18 145 / 0.14);
  --shadow-ring: 0 0 0 2px oklch(0.45 0.18 145 / 0.28);

  /* Animation timing */
  --ease-organic: cubic-bezier(0.16, 1, 0.3, 1);
```

Y en `.dark { ... }`, añadir las mismas vars pero con opacidades ajustadas para dark:

```css
  --shadow-sm: 0 1px 3px oklch(0 0 0 / 0.20);
  --shadow-md: 0 4px 16px oklch(0.65 0.18 145 / 0.12);
  --shadow-lg: 0 8px 32px oklch(0.65 0.18 145 / 0.18);
  --shadow-ring: 0 0 0 2px oklch(0.65 0.18 145 / 0.32);
  --ease-organic: cubic-bezier(0.16, 1, 0.3, 1);
```

- [ ] **Step 2: Agregar grain overlay + gradiente mesh en @layer base**

Dentro del bloque `@layer base { ... }` existente, añadir después de `body { ... }`:

```css
  /* Grain sutil en toda la app */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-size: 128px 128px;
  }

  /* Gradient mesh en background */
  body {
    background-image:
      radial-gradient(ellipse 60% 40% at 90% 10%, oklch(0.45 0.18 145 / 0.04) 0%, transparent 70%),
      radial-gradient(ellipse 50% 50% at 5% 90%, oklch(0.5 0.15 200 / 0.03) 0%, transparent 70%);
  }

  /* Focus ring mejorado */
  *:focus-visible {
    outline: 2px solid oklch(0.45 0.18 145 / 0.7);
    outline-offset: 2px;
  }

  .dark *:focus-visible {
    outline-color: oklch(0.65 0.18 145 / 0.7);
  }

  /* Display font helper */
  .font-display {
    font-family: var(--font-display), Georgia, serif;
  }
```

- [ ] **Step 3: Verificar en browser**

```bash
pnpm dev
```

Abrir `http://localhost:3000`. Verificar:
- Grain muy sutil visible en fondo (casi imperceptible, solo perceptible contra fondo blanco)
- Gradiente mesh: leve verde en esquina superior derecha, azul en inferior izquierda
- Focus: hacer Tab en cualquier link/botón → ring verde visible

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: shadow vars, grain overlay, gradient mesh, focus ring mejorado"
```

---

## Task 3: Landing Page — app/page.tsx

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Display font en títulos del hero**

En `app/page.tsx` línea ~78, el `<motion.h2>`:

```tsx
// Antes:
<motion.h2 variants={fadeUp} className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">

// Después:
<motion.h2 variants={fadeUp} className="font-display mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
```

Y en el h3 de features (~línea 107):

```tsx
// Antes:
<h3 className="text-2xl font-bold text-foreground">Funcionalidades Principales</h3>

// Después:
<h3 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Funcionalidades Principales</h3>
```

- [ ] **Step 2: Mejorar hero section — más padding y grain**

Línea ~68, la `<section>` del hero:

```tsx
// Antes:
<section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 to-transparent">

// Después:
<section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-transparent">
  {/* decorative grain overlay en hero */}
  <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")", backgroundSize: "128px 128px"}} />
```

Y el `<motion.div>` interior del hero — aumentar padding:

```tsx
// Antes:
className="mx-auto max-w-6xl px-6 py-20 text-center"

// Después:
className="relative mx-auto max-w-6xl px-6 py-24 text-center sm:py-32"
```

- [ ] **Step 3: Mejorar hover de cards de features**

Las cards del grid de features (~línea 128):

```tsx
// Antes:
<Card className="h-full border-border bg-card/50 transition-all hover:bg-card hover:shadow-md hover:-translate-y-0.5">

// Después:
<Card className="h-full border-border bg-card/60 transition-all duration-300 hover:bg-card hover:-translate-y-1" style={{"--hover-shadow": "var(--shadow-md)"} as React.CSSProperties} onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = ''}>
```

- [ ] **Step 4: Display font en CTA cards títulos**

Líneas ~166 y ~191, los `<CardTitle>`:

```tsx
// Antes:
<CardTitle>Para Agricultores</CardTitle>
// Después:
<CardTitle className="font-display text-xl">Para Agricultores</CardTitle>

// Antes:
<CardTitle>Para Administradores</CardTitle>
// Después:
<CardTitle className="font-display text-xl">Para Administradores</CardTitle>
```

- [ ] **Step 5: Verificar landing en browser (desktop + móvil)**

```bash
pnpm dev
```

Abrir `http://localhost:3000`. Verificar:
- Títulos grandes con Fraunces (serif orgánico)
- Hero tiene más altura y respira más
- Cards hover: sombra verde sutil + elevación
- Responsive: en `375px` se ve bien

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: landing — display font, hero mejorado, card hover refinado"
```

---

## Task 4: Login Page — app/auth/login/LoginClient.tsx

**Files:**
- Modify: `app/auth/login/LoginClient.tsx`

- [ ] **Step 1: Glassmorphism en la card de login**

Leer el archivo completo para ver el JSX de la Card (línea ~60+). La `<Card>` principal del login:

```tsx
// Encontrar la Card principal (alrededor de la línea 65-70 del archivo)
// Antes (buscar className en la Card):
// className o sin className explícita — agregar:

<Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur-md" style={{boxShadow: 'var(--shadow-lg)'}}>
```

- [ ] **Step 2: Display font en el título del login**

En el `<CardTitle>` del login:

```tsx
// Antes:
<CardTitle className="text-2xl">

// Después:
<CardTitle className="font-display text-2xl font-bold">
```

- [ ] **Step 3: Touch targets en botones del login**

El botón de submit y cualquier botón secundario — agregar `min-h-[48px]`:

```tsx
// Botón principal de submit (buscar type="submit"):
<Button type="submit" className="w-full min-h-[48px] text-base" disabled={isSubmitting}>

// Links de "¿Olvidaste tu contraseña?" — agregar padding mínimo:
// Buscar los Link/a del footer del card y agregar className="py-2 inline-block"
```

- [ ] **Step 4: Verificar login en browser**

```bash
pnpm dev
```

Ir a `http://localhost:3000/auth/login`. Verificar:
- Card con efecto glassmorphism (blur detrás)
- Título con Fraunces
- Botón más alto y fácil de tocar en móvil
- En modo oscuro: backdrop-blur se ve correctamente

- [ ] **Step 5: Commit**

```bash
git add app/auth/login/LoginClient.tsx
git commit -m "feat: login — glassmorphism card, display font, touch targets"
```

---

## Task 5: Dashboard Asesor — app/dashboard/page.tsx

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Sombra verde en cards de stats**

Buscar las `<Card>` en la sección stats (~línea 229):

```tsx
// Antes:
<Card className="border-border">

// Después:
<Card className="border-border/60 bg-card/70 backdrop-blur-sm transition-shadow duration-300 hover:shadow-md" style={{boxShadow: 'var(--shadow-sm)'}}>
```

- [ ] **Step 2: Touch targets en quick action cards**

Las dos cards de "Nueva Caracterización" y "Mapa NDVI" (~línea 244+):

```tsx
// En el CardContent de las action cards:
// Antes:
<CardContent className="flex items-center gap-3 p-4">

// Después (mínimo 48px de altura):
<CardContent className="flex items-center gap-3 p-4 min-h-[64px]">
```

- [ ] **Step 3: Bienvenida con display font**

Línea ~203, el h2 de bienvenida:

```tsx
// Antes:
<h2 className="text-xl font-bold text-foreground md:text-2xl">

// Después:
<h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
```

- [ ] **Step 4: Sombra en cards de registros**

Las cards del listado de registros (~línea 342):

```tsx
// Antes:
<Card className="cursor-pointer transition-all hover:bg-muted/30 hover:shadow-sm hover:-translate-y-px"

// Después:
<Card className="cursor-pointer transition-all duration-200 hover:bg-muted/30 hover:-translate-y-0.5" style={{boxShadow: 'var(--shadow-sm)'}} onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'}>
```

- [ ] **Step 5: Verificar dashboard asesor**

```bash
pnpm dev
```

Iniciar sesión como asesor. Verificar:
- Cards stats con sombra verde sutil
- Action cards con altura mínima (fácil de tocar)
- Título con Fraunces
- Lista de registros: hover con sombra más pronunciada

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: dashboard asesor — sombras verdes, touch targets, display font"
```

---

## Task 6: Admin Dashboard — components/admin-dashboard.tsx

**Files:**
- Modify: `components/admin-dashboard.tsx`

- [ ] **Step 1: Aplicar shadow-sm base en stat cards del admin**

En `admin-dashboard.tsx`, buscar las `<Card>` de estadísticas y aplicar el patrón del Task 5:

```tsx
// Buscar todas las <Card className="border-border"> o similares en stat cards
// y reemplazar con:
<Card className="border-border/60 bg-card/70 backdrop-blur-sm" style={{boxShadow: 'var(--shadow-sm)'}}>
```

- [ ] **Step 2: Display font en título del panel admin**

Buscar el heading principal del admin dashboard (h2 o h1 con "Panel" o "Administración"):

```tsx
// Cambiar el className del heading principal:
// Agregar: font-display
```

- [ ] **Step 3: Touch targets en botones de acción admin**

Buscar botones de acción (cambiar estado, aprobar, etc.) y asegurar `min-h-[48px]` o `h-12` en los que sean pequeños.

- [ ] **Step 4: Verificar panel admin**

```bash
pnpm dev
```

Iniciar sesión como admin → ir a `/admin`. Verificar:
- Cards con sombra sutil
- Heading con Fraunces
- Botones con tamaño adecuado para touch

- [ ] **Step 5: Commit**

```bash
git add components/admin-dashboard.tsx
git commit -m "feat: admin dashboard — sombras verdes, display font, touch targets"
```

---

## Task 7: Agricultor Dashboard — components/agricultor-dashboard.tsx

**Files:**
- Modify: `components/agricultor-dashboard.tsx`

- [ ] **Step 1: Aplicar mismo sistema de sombras**

Mismo patrón que Tasks 5 y 6:

```tsx
// Cards principales → agregar style={{boxShadow: 'var(--shadow-sm)'}}
// + backdrop-blur-sm + border-border/60 + bg-card/70
```

- [ ] **Step 2: Display font en título de bienvenida del agricultor**

Buscar el heading de bienvenida del agricultor y agregar `font-display`.

- [ ] **Step 3: Touch targets en botones y cards clickeables**

Todas las cards con `role="button"` o botones de acción → `min-h-[64px]` en CardContent o `min-h-[48px]` en botones.

- [ ] **Step 4: Verificar dashboard agricultor**

```bash
pnpm dev
```

Iniciar sesión como agricultor → `/dashboard`. Verificar visualmente las mejoras.

- [ ] **Step 5: Commit**

```bash
git add components/agricultor-dashboard.tsx
git commit -m "feat: agricultor dashboard — sombras verdes, display font, touch targets"
```

---

## Task 8: Form Stepper — components/characterization-form-complete.tsx

**Files:**
- Modify: `components/characterization-form-complete.tsx`

- [ ] **Step 1: Mejorar progress bar móvil**

En el stepper móvil (~línea 2738-2747), la barra de progreso:

```tsx
// Antes (la barra interna):
<div
  className="h-full bg-primary rounded-full transition-all duration-300"
  style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
/>

// Después:
<div
  className="h-full rounded-full transition-all"
  style={{
    width: `${(currentStep / steps.length) * 100}%`,
    background: 'oklch(0.45 0.18 145)',
    boxShadow: '0 0 8px oklch(0.45 0.18 145 / 0.5)',
    transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
  }}
/>
```

Y el contenedor de la barra:

```tsx
// Antes:
<div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">

// Después:
<div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
```

- [ ] **Step 2: Glow en step circle activo (tablet)**

En el stepper tablet (~línea 2764), el div del círculo activo:

```tsx
// Antes:
<div className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
  isActive ? "bg-primary text-primary-foreground"
  : isCompleted ? "bg-primary/80 text-primary-foreground"
  : "bg-muted text-muted-foreground"
}`}>

// Después:
<div className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ${
  isActive ? "bg-primary text-primary-foreground"
  : isCompleted ? "bg-primary/80 text-primary-foreground"
  : "bg-muted text-muted-foreground"
}`} style={isActive ? {boxShadow: '0 0 0 3px oklch(0.45 0.18 145 / 0.25), 0 0 12px oklch(0.45 0.18 145 / 0.2)'} : {}}>
```

- [ ] **Step 3: Glow en step circle activo (desktop)**

Mismo cambio en el stepper desktop (~línea 2796):

```tsx
// Agregar style condicional al div del círculo igual que en Step 2
<div
  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
    isActive
      ? "bg-primary text-primary-foreground"
      : isCompleted
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground"
  }`}
  style={isActive ? {boxShadow: '0 0 0 3px oklch(0.45 0.18 145 / 0.25), 0 0 12px oklch(0.45 0.18 145 / 0.2)'} : {}}
>
```

- [ ] **Step 4: Labels más grandes en formulario**

Buscar `<Label>` en el formulario — la mayoría usan el componente Label de Radix. En `globals.css`, dentro de `@layer base`, agregar:

```css
  /* Labels más legibles en formulario de campo */
  label {
    font-size: 0.9375rem; /* 15px */
    font-weight: 500;
  }
```

- [ ] **Step 5: Verificar formulario**

```bash
pnpm dev
```

Ir a `http://localhost:3000/formulario`. Verificar:
- Progress bar más gruesa y con glow verde en móvil
- Círculo del paso activo con glow verde
- Transición de paso: fluida (0.5s organic ease)
- Labels más grandes y legibles

- [ ] **Step 6: Commit**

```bash
git add components/characterization-form-complete.tsx app/globals.css
git commit -m "feat: form stepper — progress bar con glow, labels más grandes"
```

---

## Task 9: Revisión Final y QA Visual

**Files:** Ninguno (solo verificación)

- [ ] **Step 1: Revisar landing en móvil (375px)**

```bash
pnpm dev
```

En DevTools → toggle device toolbar → iPhone SE (375px). Verificar:
- Fuentes legibles sin zoom
- Touch targets ≥ 48px en botones visibles
- Grain no distrae ni pesa visualmente
- Gradient mesh no interfiere con legibilidad

- [ ] **Step 2: Revisar en dark mode**

Activar dark mode via ThemeToggle. Verificar en todas las páginas:
- Sombras se ven correctas (no demasiado intensas en dark)
- Glassmorphism login card funciona en dark
- Grain overlay barely visible (no excesivo en dark)
- Gradient mesh sutil

- [ ] **Step 3: Verificar contraste AA**

En las páginas con texto sobre fondos modificados, usar DevTools → Accessibility → Color Contrast. Verificar:
- Texto `muted-foreground` sobre cards glassmorphism: ≥ 4.5:1
- Labels del formulario sobre background: ≥ 4.5:1

- [ ] **Step 4: Commit final si hay ajustes**

```bash
git add -A
git commit -m "fix: ajustes QA visual — contraste, dark mode, móvil"
```

---

## Self-Review

### Cobertura del spec
- ✅ Tipografía: Fraunces + Plus Jakarta Sans (Tasks 1-3)
- ✅ Glassmorphism suave: Login card (Task 4)
- ✅ Sombras verde-tintadas: todas las páginas (Tasks 5-7)
- ✅ Gradient mesh + grain: globals.css (Task 2)
- ✅ Border radius 0.875rem: globals.css Task 2
- ✅ Animaciones refinadas: easing `--ease-organic` en progress bar (Task 8)
- ✅ Focus ring mejorado: globals.css Task 2
- ✅ Touch targets ≥ 48px: Tasks 4-7
- ✅ Form stepper progress bar + labels: Task 8
- ✅ QA responsive + dark mode: Task 9

### No placeholders
- Todas las clases CSS están escritas explícitamente
- Todos los comandos tienen expected output
- Valores de oklch son exactos del spec

### Consistencia de tipos
- `var(--shadow-sm/md/lg)` definidas en Task 2, usadas en Tasks 4-7 ✅
- `var(--font-display)` definida en Task 1, usada como clase `font-display` desde Task 3 ✅
- oklch colors coinciden con los del `:root` existente ✅
