# 25-documento-seguridad

> Convertido desde `25-documento-seguridad.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**25. Documento de Seguridad**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# 1. Modelo de Amenazas

|  |  |
| --- | --- |
| **Amenaza** | **Control implementado** |
| Acceso no autorizado a datos | RLS en todas las tablas de PostgreSQL |
| Robo de sesión | JWT en cookies HttpOnly + Secure + SameSite=Lax |
| Inyección SQL | Prisma ORM parametriza todas las queries automáticamente |
| XSS | React escapa contenido por defecto. No se usa dangerouslySetInnerHTML. |
| CSRF | Cookies SameSite=Lax + validación de origin en Next.js |
| Exposición de claves | Variables sensibles solo en servidor (NEXT\_PUBLIC\_\* = público conscientemente) |
| Bots / spam en formulario | Cloudflare Turnstile captcha en formulario público |
| Fuerza bruta en login | Rate limiting de Supabase Auth + cooldown en intentos |
| Acceso a admin sin autorización | Doble capa: middleware proxy.ts + verificación de rol en cada endpoint |
| Datos en tránsito | HTTPS forzado por Vercel en todos los ambientes |

# 2. Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Las políticas implementadas son:

|  |  |  |
| --- | --- | --- |
| **Tabla** | **Política** | **Rol** |
| profiles | Ver propio perfil + admin ve todos | authenticated |
| visitas | Asesor ve las suyas; admin ve todas | authenticated |
| beneficiarios | Por cadena visita → asesor\_id = auth.uid() | authenticated |
| predios | Por cadena beneficiario → visita → asesor | authenticated |
| caracterizaciones | Por visita o beneficiario según rol | authenticated |
| abastecimiento\_agua | Por cadena predio → beneficiario → visita | authenticated |
| riesgos\_predio | Por cadena predio → beneficiario → visita | authenticated |
| area\_productiva | Por cadena predio → beneficiario → visita | authenticated |
| informacion\_financiera | Por beneficiario → visita → asesor | authenticated |

# 3. Claves y Secretos

* SUPABASE\_SERVICE\_ROLE\_KEY: solo en servidor. Bypasea RLS — nunca exponer al cliente.
* DATABASE\_URL: solo en servidor. Acceso directo a PostgreSQL.
* SMTP\_PASS: solo en servidor. Credencial SMTP para envío de correos.
* TURNSTILE\_SECRET\_KEY: solo en servidor. Validación de captcha.
* NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY: pública pero con RLS. No permite acceso admin.
