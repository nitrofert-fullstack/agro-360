# 37-roadmap-evolucion

> Convertido desde `37-roadmap-evolucion.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**37. Roadmap de Evolución**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# Versiones Futuras Recomendadas

|  |  |  |  |
| --- | --- | --- | --- |
| **Versión** | **Hito** | **Funcionalidades propuestas** | **Prioridad** |
| 1.1 | Mejoras operativas | Notificaciones push, filtros avanzados en dashboard asesor, historial de cambios de estado, edición masiva de estados | Alta |
| 1.2 | Reportes avanzados | Dashboard de analítica con gráficas interactivas (Recharts), reporte ejecutivo mensual en PDF, exportación a Excel (.xlsx), mapa coroplético por municipio | Media |
| 1.3 | Mejoras de campo | Modo offline con IndexedDB + sincronización diferida, geolocalización en tiempo real, integración con cámara nativa mejorada, firma digital con mayor resolución | Media |
| 2.0 | Plataforma multi-tenencia | Soporte para múltiples operadores/programas, módulo de configuración de formularios (campos dinámicos), integración con sistemas ERP del operador, API pública para consulta de radicados | Baja |
| 2.1 | Inteligencia de datos | Scoring crediticio automático basado en datos del formulario, detección de duplicados por similitud de datos, predicción de viabilidad con modelos ML, recomendaciones automáticas por tipo de cultivo | Baja |

# Consideraciones Técnicas para Evolución

* El schema de Prisma está preparado para agregar columnas vía migraciones idempotentes.
* El formulario de 9 pasos puede ampliarse agregando pasos adicionales en characterization-form-complete.tsx.
* La arquitectura serverless de Vercel escala automáticamente — no requiere cambios de infraestructura para mayor volumen.
* Para modo offline se recomienda retomar la integración con Dexie (IndexedDB) que existía en versiones anteriores.
* Para multi-tenencia se requiere agregar una tabla organizaciones y adaptar las políticas RLS.
