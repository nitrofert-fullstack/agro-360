# 09-diagrama-despliegue

> Convertido desde `09-diagrama-despliegue.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**09. Diagrama de Despliegue**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# Topología de Despliegue

El sistema se despliega en dos plataformas PaaS sin servidores propios:

|  |  |  |  |
| --- | --- | --- | --- |
| **Servicio** | **Proveedor** | **Plan mín. recomendado** | **Función** |
| Frontend + API | Vercel | Pro | Hosting SSR, funciones serverless, CDN global |
| Base de datos | Supabase | Pro | PostgreSQL 15, Auth, Storage, RLS |
| Repositorio | GitHub | Private repo | CI/CD: cada push a main redespliega en Vercel |
| DNS / CDN | Cloudflare | Free | DNS, HTTPS, protección DDoS, Turnstile captcha |
| Correos | SMTP externo | SendGrid / SES | Envío de notificaciones transaccionales |

# Flujo de CI/CD

* 1. Desarrollador hace git push a la rama main en GitHub.
* 2. Vercel detecta el push vía webhook y dispara el build.
* 3. Vercel ejecuta pnpm install → next build.
* 4. Si el build es exitoso, el deploy se publica como nueva versión de producción.
* 5. Las variables de entorno se inyectan en build-time (NEXT\_PUBLIC\_\*) y en runtime (secretos).
* 6. El CDN de Vercel distribuye los assets estáticos globalmente.
* 7. Las funciones serverless se ejecutan en la región más cercana al usuario.

# Ambientes

|  |  |  |  |
| --- | --- | --- | --- |
| **Ambiente** | **URL** | **Branch** | **Uso** |
| Producción | https://<dominio-prod> | main | Usuarios finales |
| Preview | https://<hash>.vercel.app | cualquier PR | QA / revisión |
| Desarrollo | http://localhost:3000 | local | Desarrollo activo |
