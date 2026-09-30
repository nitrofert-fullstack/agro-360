# 28-plan-backup-recuperacion

> Convertido desde `28-plan-backup-recuperacion.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**28. Plan de Backup y Recuperación**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# 1. Estrategia de Backup

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| **Componente** | **Tipo de backup** | **Frecuencia** | **Retención** | **Responsable** |
| Base de datos (PostgreSQL) | Automático por Supabase | Diario | 7 días (Pro) | Supabase |
| Storage (fotos/firmas) | Incluido en backup Supabase Pro | Diario | 7 días | Supabase |
| Código fuente | Git (cada commit) | Continua | Indefinida | Equipo dev / GitHub |
| Variables de entorno | Manual — exportar de Vercel | Mensual | Indefinida | Administrador |
| Configuración Supabase | Manual — exportar schema | Mensual | Indefinida | Administrador |

# 2. Procedimiento de Backup Manual

* Supabase → Database → Backups → Download backup (archivo .sql).
* Guardar el archivo en ubicación segura fuera de Supabase (ej. Google Drive cifrado).
* Documentar la fecha y versión del backup.
* Verificar que el dump se puede restaurar en un proyecto de prueba.

# 3. Procedimiento de Recuperación (RTO/RPO)

|  |  |  |  |
| --- | --- | --- | --- |
| **Escenario** | **RTO objetivo** | **RPO objetivo** | **Procedimiento** |
| Fallo de código (Vercel) | < 5 min | 0 (no afecta BD) | Rollback en Vercel → Deployments → Promote anterior |
| Corrupción de datos (BD) | < 2 horas | 24 horas (último backup diario) | Supabase → Backups → Restore |
| Fallo total de Supabase | < 4 horas | 24 horas | Crear nuevo proyecto + restaurar dump + actualizar DNS |
| Pérdida de credenciales | < 30 min | N/A | Generar nuevas claves en Supabase Dashboard + actualizar Vercel env vars |
