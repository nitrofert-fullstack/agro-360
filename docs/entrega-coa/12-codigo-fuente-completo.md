# 12-codigo-fuente-completo

> Convertido desde `12-codigo-fuente-completo.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**12. Código Fuente Completo**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# Entrega del Código Fuente

El código fuente completo se entrega en un repositorio Git privado. Las credenciales de acceso se entregan al operador por canal seguro.

# Estructura del Repositorio

|  |  |
| --- | --- |
| **Directorio / Archivo** | **Descripción** |
| app/ | Páginas y Route Handlers (Next.js App Router) |
| app/api/ | Endpoints serverless (caracterizaciones, admin, invitar, etc.) |
| app/dashboard/ | Dashboard de asesor y agricultor |
| app/admin/ | Panel de administración |
| app/formulario/ | Formulario público de caracterización |
| app/registro/ | Registro de agricultores |
| components/ | Componentes React reutilizables |
| context/ | Contexto de autenticación global |
| hooks/ | Hooks personalizados |
| lib/ | Utilidades: Prisma, Supabase, email, PDF |
| prisma/ | Schema Prisma y migraciones |
| supabase/migrations/ | Migraciones SQL de Supabase |
| scripts/ | Scripts SQL iniciales y utilidades |
| public/ | Assets estáticos (íconos, imágenes) |
| types/ | Declaraciones TypeScript ambient |
| proxy.ts | Middleware Next.js 16 (auth guard + session refresh) |
| next.config.mjs | Configuración de Next.js |
| tsconfig.json | Configuración TypeScript |
| package.json | Dependencias y scripts npm |
| .env.local | Variables de entorno (NO incluido en Git) |

# Instrucciones de Acceso

* Clonar el repositorio con las credenciales proporcionadas.
* Copiar .env.local.example a .env.local y completar las variables.
* Ejecutar: pnpm install
* Ejecutar: pnpm dev (desarrollo) o pnpm build && pnpm start (producción local).
* Ver Manual de Instalación para despliegue en Vercel.
