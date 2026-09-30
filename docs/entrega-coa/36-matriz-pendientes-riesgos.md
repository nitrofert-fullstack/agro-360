# 36-matriz-pendientes-riesgos

> Convertido desde `36-matriz-pendientes-riesgos.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**36. Matriz de Pendientes y Riesgos**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# Pendientes al Cierre de la Versión 1.0

|  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| **ID** | **Descripción** | **Prioridad** | **Responsable** | **Fecha límite** | **Estado** |
| P001 | Firma de actas de entrega, aceptación y paso a producción | Alta | Operador + Dev | Inmediato | Pendiente de firma |
| P002 | Evidencias de capacitación (doc 35) una vez completada la sesión | Media | Operador | Post-capacitación | Pendiente |
| P003 | Configurar backups automáticos en Supabase Pro | Alta | Operador | Inmediato | Pendiente verificación |
| P004 | Configurar dominio personalizado y certificado TLS | Alta | Operador | Inmediato | Según contrato |

# Matriz de Riesgos

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| **ID** | **Riesgo** | **Probabilidad** | **Impacto** | **Mitigación** |
| R001 | Fallo de servicio Supabase (downtime) | Baja | Alto | Plan de contingencia: backup + restauración en nuevo proyecto. SLA Supabase Pro 99.9%. |
| R002 | Expiración de credenciales SMTP | Media | Medio | Configurar alertas de expiración. Tener proveedor SMTP alternativo. |
| R003 | Saturación del plan de Vercel/Supabase | Media | Medio | Monitorear uso mensual. Migrar a plan superior si se supera el 80% del límite. |
| R004 | Pérdida de acceso al repositorio Git | Baja | Alto | Mantener clon local del repositorio. Accesos compartidos entre responsables. |
| R005 | Cambios en API de Supabase que rompan la integración | Baja | Medio | Fijar versiones de dependencias en package.json. Revisar changelogs antes de actualizar. |
| R006 | Fuga de claves de servicio | Muy baja | Muy alto | Rotación inmediata de claves en Supabase + Vercel. Auditoría de logs. Notificación a usuarios. |
| R007 | Incremento inesperado de usuarios que sature la BD | Baja | Medio | Escalar plan Supabase. Optimizar índices en PostgreSQL. |
