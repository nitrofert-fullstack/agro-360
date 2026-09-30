# 16-variables-entorno-ejemplo

> Convertido desde `16-variables-entorno-ejemplo.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**16. Variables de Entorno de Ejemplo**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# Variables de entorno: .env.local

|  |  |  |
| --- | --- | --- |
| **Variable** | **Ejemplo / Descripción** | **Requerida** |
| NEXT\_PUBLIC\_SUPABASE\_URL | https://xxxx.supabase.co | Sí |
| NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY | eyJ... (clave pública) | Sí |
| SUPABASE\_SERVICE\_ROLE\_KEY | eyJ... (SECRETO — solo servidor) | Sí |
| DATABASE\_URL | postgresql://postgres.xxx:6543/postgres?pgbouncer=true | Sí (Prisma) |
| DIRECT\_URL | postgresql://postgres.xxx:5432/postgres | Sí (Prisma migrations) |
| NEXT\_PUBLIC\_APP\_URL | https://agro360.tudominio.com | Sí |
| NEXT\_PUBLIC\_TURNSTILE\_SITE\_KEY | 0x4AAAAAAA... | Sí (producción) |
| TURNSTILE\_SECRET\_KEY | 0x4AAAAAAA... (SECRETO) | Sí (producción) |
| SMTP\_HOST | smtp.gmail.com | Sí |
| SMTP\_PORT | 587 | Sí |
| SMTP\_USER | noreply@tudominio.com | Sí |
| SMTP\_PASS | contraseña de aplicación (SECRETO) | Sí |
| SMTP\_FROM | Agro360 <noreply@tudominio.com> | Sí |

# Notas de Seguridad

* NUNCA commitear claves al repositorio. Usar .gitignore para .env.local.
* Las variables NEXT\_PUBLIC\_\* son visibles en el cliente, así que deben usarse solo para claves públicas.
* SUPABASE\_SERVICE\_ROLE\_KEY bypasea RLS, mantenerla solo en servidor.
* En Vercel: Settings → Environment Variables (cifradas en reposo).
* Rotar claves si se sospecha exposición. Vercel permite redeploy sin downtime.
