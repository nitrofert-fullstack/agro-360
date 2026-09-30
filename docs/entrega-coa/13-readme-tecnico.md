# 13-readme-tecnico

> Convertido desde `13-readme-tecnico.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**13. README Técnico**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# Agro360 — README Técnico

## Descripción

Sistema web de caracterización predial agropecuaria. Formulario de 9 pasos, multirol, envío directo al servidor, generación de PDF, notificaciones por correo.

## Requisitos

|  |  |
| --- | --- |
| **Herramienta** | **Versión** |
| Node.js | 20.x+ |
| pnpm | 8.x+ |
| Git | 2.x+ |
| Cuenta Supabase | Plan Free o Pro |
| Cuenta Vercel | Plan Hobby o Pro |

## Instalación rápida

git clone <repo-url> agro-360
cd agro-360
pnpm install
cp .env.local.example .env.local
# Completar variables en .env.local
pnpm dev

## Variables de entorno requeridas

* NEXT\_PUBLIC\_SUPABASE\_URL
* NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY
* SUPABASE\_SERVICE\_ROLE\_KEY
* DATABASE\_URL
* NEXT\_PUBLIC\_APP\_URL
* SMTP\_HOST
* SMTP\_USER
* SMTP\_PASS
* SMTP\_FROM
* NEXT\_PUBLIC\_TURNSTILE\_SITE\_KEY
* TURNSTILE\_SECRET\_KEY

## Scripts disponibles

|  |  |
| --- | --- |
| **Comando** | **Descripción** |
| pnpm dev | Servidor de desarrollo (Turbopack) |
| pnpm build | Build de producción |
| pnpm start | Iniciar build de producción |
| pnpm lint | ESLint |
| npx tsc --noEmit | TypeCheck sin emitir |
| npx prisma generate | Regenerar cliente Prisma |
