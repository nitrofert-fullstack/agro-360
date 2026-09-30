# 26-matriz-roles-permisos

> Convertido desde `26-matriz-roles-permisos.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**26. Matriz de Roles y Permisos**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# Permisos por Funcionalidad

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| **Funcionalidad** | **Admin** | **Asesor** | **Analista** | **Agricultor** |
| Ver propio perfil | ✅ | ✅ | ✅ | ✅ |
| Editar propio perfil | ✅ | ✅ | ✅ | ✅ |
| Crear caracterización | ✅ | ✅ | ❌ | ❌ |
| Ver todas las caracterizaciones | ✅ | Solo las suyas | ✅ | Solo la propia |
| Editar caracterización | ✅ | Solo las suyas | ❌ | ❌ |
| Eliminar caracterización | ✅ | ❌ | ❌ | ❌ |
| Cambiar estado → REVISADO | ✅ | ✅ | ❌ | ❌ |
| Cambiar estado → EN\_ESTUDIO\_CREDITO | ✅ | ❌ | ✅ | ❌ |
| Cambiar estado → APROBADO | ✅ | ❌ | ✅ | ❌ |
| Cambiar estado → CANCELADO | ✅ | ❌ | ✅ | ❌ |
| Override de cualquier estado | ✅ | ❌ | ❌ | ❌ |
| Ver panel de estadísticas | ✅ | ❌ | ❌ | ❌ |
| Invitar usuarios | ✅ | ❌ | ❌ | ❌ |
| Cambiar rol de usuarios | ✅ | ❌ | ❌ | ❌ |
| Suspender/activar usuarios | ✅ | ❌ | ❌ | ❌ |
| Eliminar usuarios | ✅ | ❌ | ❌ | ❌ |
| Reasignar asesor en caracterización | ✅ | ❌ | ❌ | ❌ |
| Exportar CSV masivo | ✅ | ✅ | ✅ | ❌ |
| Descargar PDF individual | ✅ | ✅ | ✅ | ✅ |
| Ver radicado y QR | ✅ | ✅ | ✅ | ✅ |

# Transiciones de Estado Permitidas por Rol

|  |  |  |  |
| --- | --- | --- | --- |
| **Desde → Hasta** | **Admin** | **Asesor** | **Analista** |
| INICIADO → REVISADO | ✅ | ✅ | ❌ |
| REVISADO → EN\_ESTUDIO\_CREDITO | ✅ | ❌ | ✅ |
| EN\_ESTUDIO\_CREDITO → APROBADO | ✅ | ❌ | ✅ |
| EN\_ESTUDIO\_CREDITO → CANCELADO | ✅ | ❌ | ✅ |
| Cualquier → cualquier (override) | ✅ | ❌ | ❌ |
