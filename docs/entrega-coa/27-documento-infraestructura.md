# 27-documento-infraestructura

> Convertido desde `27-documento-infraestructura.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**27. Documento de Infraestructura**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# 1. Servicios en Producción

|  |  |  |  |
| --- | --- | --- | --- |
| **Servicio** | **Proveedor** | **Plan** | **URL** |
| Frontend + API | Vercel | Pro (recomendado) | vercel.com |
| Base de datos + Auth + Storage | Supabase | Pro (recomendado) | supabase.com |
| Repositorio de código | GitHub | Private | github.com |
| Correo transaccional | SMTP externo (Gmail/SendGrid/SES) | Según volumen | — |
| Captcha anti-bot | Cloudflare Turnstile | Free | cloudflare.com/products/turnstile |

# 2. Especificaciones Técnicas

|  |  |
| --- | --- |
| **Componente** | **Especificación** |
| Runtime | Node.js 20.x (Vercel serverless) |
| Base de datos | PostgreSQL 15+ en Supabase (región: South America São Paulo) |
| Connection pooler | PgBouncer (Supabase) — puerto 6543, modo transaction |
| Storage | S3-compatible, buckets privados en Supabase |
| CDN | Edge network global de Vercel (100+ puntos de presencia) |
| TLS | Let's Encrypt (auto-renovado por Vercel) |
| Retención de logs | 1 día (Vercel Hobby) / 7 días (Vercel Pro) |

# 3. Límites de los Planes Gratuitos (referencia)

|  |  |
| --- | --- |
| **Servicio** | **Plan Free — límites** |
| Vercel Hobby | 100GB bandwidth/mes, 6000 min build/mes, 1 día de logs |
| Supabase Free | 500MB BD, 5GB Storage, 50K MAU auth, sin backups automáticos |

Para producción con volumen de uso real se recomienda migrar a planes Pro en ambos servicios.
