# 23-manual-tecnico

> Convertido desde `23-manual-tecnico.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**23. Manual Técnico**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# 1. Stack y Versiones

|  |  |
| --- | --- |
| **Componente** | **Versión** |
| Next.js | 16.0.10 |
| React | 19.2.0 |
| TypeScript | 5.x |
| Tailwind CSS | 4.1.9 |
| Prisma | 7.x (prisma-client-js) |
| Supabase JS | 2.x |
| Leaflet | 1.9.4 |
| React Hook Form | 7.60 |
| Zod | 3.25 |

# 2. Estructura de Carpetas

Ver documento 12 (Código Fuente) para la estructura completa del repositorio.

# 3. Autenticación

* Supabase Auth con JWT en cookies HttpOnly + Secure + SameSite=Lax.
* proxy.ts refresca la sesión en cada request con updateSession().
* AuthContext cliente expone: user, profile, isAsesor, isAdmin, signOut().
* Listener visibilitychange refresca sesión al volver a la pestaña.
* refresh\_token\_not\_found detectado → signOut() automático para limpiar estado.

# 4. Base de Datos

* PostgreSQL 15+ en Supabase con RLS habilitado en todas las tablas.
* Acceso desde API vía Prisma ORM + PrismaPg adapter (connection pooler).
* Auth operations (createUser, deleteUser, ban) vía Supabase Admin Client.
* Storage (fotos, firmas) vía Supabase Storage SDK.

# 5. Flujo de Datos: Crear Caracterización

* 1. POST /api/caracterizaciones con payload JSON.
* 2. Si hay JWT de asesor: asignar asesor\_id = user.id.
* 3. Si es público: validar captcha Turnstile.
* 4. Insertar en cascada: visitas → beneficiarios → predios → sub-tablas → caracterizaciones.
* 5. Subir fotos y firma a Supabase Storage.
* 6. Generar radicado\_oficial (RAD-000XXX).
* 7. Si beneficiario tiene correo: crear cuenta agricultor + enviar credenciales.
* 8. Retornar { radicadoOficial }.
