# Rediseño Visual — Enfoque A: Refinamiento

**Fecha:** 2026-05-08  
**Proyecto:** Santander Agro360  
**Alcance:** Refinamiento visual sin cambio estructural de rutas ni lógica

---

## Contexto

Sistema de caracterización predial agrícola para Santander, Colombia. Audiencia mixta: asesores de campo, agricultores (incluye adultos mayores rurales), administradores, analistas. Debe funcionar bien en móvil en condiciones de campo.

---

## Objetivos

- Apariencia moderna, fluida y hermosa sin tocar lógica de negocio
- Mantener paleta de colores existente (verde primario `oklch(0.45 0.18 145)` + neutros azul-gris)
- Mejorar legibilidad y usabilidad para todo público
- Mobile-first riguroso (touch targets ≥ 48px)

---

## Tipografía

| Uso | Fuente | Motivo |
|-----|--------|--------|
| Display / Títulos | Fraunces | Serif orgánico, cálido, memorable |
| Cuerpo / UI | Plus Jakarta Sans | Limpia, moderna, legible en móvil |

Importar via `next/font/google`. Reemplazar Geist en `layout.tsx` y actualizar `--font-sans` en `globals.css`.

---

## Sistema Visual

### Glassmorphism Suave
Cards autenticadas y hero con `backdrop-filter: blur(12px)` + borde `1px solid oklch(... / 0.12)`. No usar en el formulario (claridad sobre estética en contexto de captura de datos).

### Sombras
- Base: `0 1px 3px oklch(0 0 0 / 0.08)`
- Hover: `0 4px 16px oklch(0.45 0.18 145 / 0.12)` (tintada en verde)
- Activo/pressed: `0 0 0 2px var(--primary) / 0.3` (ring)

### Fondo
- Gradiente mesh en `body`: verde primario al 3% en esquina superior derecha + azul-gris al 2% en inferior izquierda
- Grain overlay CSS en hero y secciones clave: `background-image: url("data:image/svg+xml...")` a 4% opacidad

### Border Radius
`--radius`: `0.625rem` → `0.875rem` (más generoso, más moderno)

---

## Espaciado & Layout

- Padding vertical secciones: aumentar ~25% (más aire)
- Touch targets: mínimo `48px` en height para todo elemento interactivo en móvil
- Max-width contenedores: mantener `max-w-5xl` / `max-w-6xl` existentes

---

## Animaciones

- Page load stagger: duración de `0.4s` → `0.6s`, easing `cubic-bezier(0.16, 1, 0.3, 1)`
- Hover cards: `translateY(-2px)` + sombra tintada (ya existe, refinar timing)
- Badge state transitions: `transition: all 200ms ease`
- No añadir animaciones nuevas — refinar las existentes

---

## Formulario (Characterization Form)

Solo tocar el header/stepper del form, NO la lógica ni los campos:

- **Progress bar continua** reemplaza indicador de paso actual — barra llena proporcional a paso/total
- Focus rings más visibles: `ring-2 ring-primary/60`
- Labels con `font-size: 0.9375rem` (15px) mínimo para legibilidad rural
- Error messages con ícono + color rojo suave (ya existe, mejorar contraste)

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `app/globals.css` | Nuevas fuentes, radius, sombras, grain, gradiente mesh, animaciones base |
| `app/layout.tsx` | Importar Fraunces + Plus Jakarta Sans via next/font |
| `app/page.tsx` | Aplicar nuevas clases, mejorar hero spacing, grain overlay |
| `app/auth/login/LoginClient.tsx` | Card glassmorphism, mejora visual del form de login |
| `app/dashboard/page.tsx` | Cards con nueva sombra, touch targets, mejor spacing |
| `components/admin-dashboard.tsx` | Mismas mejoras de cards y spacing |
| `components/agricultor-dashboard.tsx` | Mismas mejoras de cards y spacing |
| `components/characterization-form-complete.tsx` | Solo stepper/progress bar + label size |

---

## Lo que NO cambia

- Rutas, estructura de carpetas
- Lógica de negocio, hooks, contextos
- Tokens de color (solo se refinan sombras/opacidades derivadas)
- Componentes Radix UI base
- Lógica del formulario (solo presentación del stepper)

---

## Criterios de Éxito

- Visualmente notablemente mejor sin regresiones funcionales
- Legible en pantalla de móvil a plena luz del sol (contraste AA mínimo)
- Animaciones fluidas a 60fps en dispositivos mid-range
- Si el resultado no satisface al usuario → escalar a Enfoque B (sidebar + restructura)
