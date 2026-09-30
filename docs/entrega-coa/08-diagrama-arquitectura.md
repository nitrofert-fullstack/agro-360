# 08-diagrama-arquitectura

> Convertido desde `08-diagrama-arquitectura.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**08. Diagrama de Arquitectura**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# Arquitectura de Alto Nivel

El diagrama muestra el flujo desde el navegador hasta los servicios externos:

┌──────────────────────────────────────────────────────────┐
│ Cliente (Navegador) │
│ React UI (Next.js) → React Hook Form + Zod │
└────────────────────────────┬─────────────────────────────┘
│ HTTPS
┌────────────────────────────▼─────────────────────────────┐
│ Vercel (Edge) │
│ proxy.ts: refresh session + auth guard │
│ Route Handlers (app/api/\*) │
│ • /api/caracterizaciones • /api/admin/\* │
│ • /api/actualizar-formulario • /api/invitar │
└────────────────────────────┬─────────────────────────────┘
│
┌────────────────────────────▼─────────────────────────────┐
│ Supabase │
│ Auth (JWT) │ PostgreSQL + RLS │ Storage (S3) │
└───────────────┬──────────────────────────────────────────┘
│
┌───────────┴──────────┐
│ SMTP (correos) │ Cloudflare Turnstile (captcha)
└──────────────────────┘

# Descripción de Componentes

|  |  |  |
| --- | --- | --- |
| **Componente** | **Tipo** | **Función** |
| Navegador | Cliente | React 19 + Next.js App Router. Renderizado SSR/CSR. |
| proxy.ts | Middleware | Refresca JWT en cada request. Redirige rutas protegidas. |
| app/api/\* | Serverless Functions | Lógica de negocio. Usan Prisma (BD) y Supabase Admin (auth). |
| Supabase Auth | PaaS | JWT, registro, login, recuperación de contraseña. |
| PostgreSQL | PaaS | 11 tablas con RLS. Conexión vía Prisma + PrismaPg adapter. |
| Supabase Storage | PaaS | Buckets S3-compatible para fotos y firmas. |
| Vercel | PaaS | Deploy automático desde Git. Edge CDN + funciones Node 20. |
| Nodemailer | Librería | Envío de correos transaccionales vía SMTP. |
| Cloudflare Turnstile | SaaS | Captcha para formulario público sin login. |
