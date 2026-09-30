# 22-manual-administrador

> Convertido desde `22-manual-administrador.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**22. Manual de Administrador**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# 1. Panel de Administración (/admin)

El panel de administración es accesible solo para usuarios con rol 'admin'. Desde aquí se gestiona todo el sistema.

# 2. Gestión de Usuarios (/admin/usuarios)

|  |  |  |
| --- | --- | --- |
| **Acción** | **Cómo hacerlo** | **Notas** |
| Invitar usuario | Presionar 'Invitar' → ingresar email, nombre y rol | Genera cuenta y envía correo con credenciales temporales |
| Cambiar rol | En la fila del usuario → menú → 'Cambiar rol' | El cambio afecta inmediatamente los permisos |
| Suspender/Activar | Toggle en la columna 'Estado' | No aplica a admins. Supabase bannea/desbanea al usuario |
| Eliminar | Menú → 'Eliminar' → confirmar | Borra datos de BD y auth.users. Irreversible. |

# 3. Gestión de Caracterizaciones (/admin/caracterizaciones)

|  |  |
| --- | --- |
| **Función** | **Descripción** |
| Filtrar | Por estado, asesor, municipio, rango de fechas |
| Buscar | Por radicado o nombre del beneficiario |
| Ver detalle | Clic en la fila → vista completa con mapa y fotos |
| Cambiar estado | Override a cualquier estado válido |
| Reasignar asesor | Cambiar el asesor asignado a la caracterización |
| Descargar PDF | Ficha individual imprimible |
| Exportar CSV | Todas las caracterizaciones en un archivo CSV |

# 4. Variables de Entorno Críticas

Las siguientes variables son gestionadas en Vercel → Settings → Environment Variables. Nunca commitearlas al repositorio.

* SUPABASE\_SERVICE\_ROLE\_KEY
* DATABASE\_URL
* SMTP\_PASS
* TURNSTILE\_SECRET\_KEY

# 5. Respaldo y Recuperación

* Supabase Pro realiza backups diarios automáticamente (retención 7 días).
* Para backup manual: Supabase → Database → Backups → Download backup.
* Para restaurar: crear proyecto Supabase nuevo → importar dump SQL.
