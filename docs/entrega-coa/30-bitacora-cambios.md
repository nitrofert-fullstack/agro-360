# 30-bitacora-cambios

> Convertido desde `30-bitacora-cambios.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**30. Bitácora de Cambios**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| **Versión** | **Fecha** | **Tipo** | **Descripción** | **Autor** |
| 1.0.0 | Abril 2026 | Release | Versión inicial. Módulos: formulario 9 pasos, dashboard por rol, admin, estados, correos. | Equipo de Desarrollo |
| 1.0.0 | Abril 2026 | Fix | Corrección recursión infinita RLS en tabla profiles (BUG001). Migración 20260427\_rls\_completo.sql. | Equipo de Desarrollo |
| 1.0.0 | Abril 2026 | Fix | Corrección error Prisma Turbopack — cambio a generator prisma-client-js (BUG002). | Equipo de Desarrollo |
| 1.0.0 | Abril 2026 | Fix | Migración a PrismaPg adapter para compatibilidad con Prisma 7 (BUG003). | Equipo de Desarrollo |
| 0.9.0 | Marzo 2026 | Feature | Agregado rol analista con permisos propios de evaluación crediticia. | Equipo de Desarrollo |
| 0.9.0 | Marzo 2026 | Feature | Registro de agricultores vía /api/registro-agricultor. | Equipo de Desarrollo |
| 0.8.0 | Febrero 2026 | Feature | Fotos del documento de identidad (frontal y trasera) en paso 8. | Equipo de Desarrollo |
| 0.8.0 | Febrero 2026 | Feature | Contacto secundario en datos del beneficiario. | Equipo de Desarrollo |
| 0.7.0 | Febrero 2026 | Feature | Formulario público con captcha Cloudflare Turnstile. | Equipo de Desarrollo |
| 0.6.0 | Enero 2026 | Feature | Dashboard del agricultor con QR de verificación. | Equipo de Desarrollo |
| 0.5.0 | Enero 2026 | Feature | Módulo de administración: usuarios, estadísticas, cambio de estado. | Equipo de Desarrollo |
| 0.4.0 | Diciembre 2025 | Feature | Exportación a PDF (jsPDF) y CSV. | Equipo de Desarrollo |
| 0.3.0 | Diciembre 2025 | Feature | Formulario de 9 pasos con firma digital y fotos. | Equipo de Desarrollo |
| 0.2.0 | Noviembre 2025 | Feature | Autenticación multirol con Supabase Auth. | Equipo de Desarrollo |
| 0.1.0 | Octubre 2025 | Init | Inicialización del proyecto Next.js + Supabase. | Equipo de Desarrollo |
