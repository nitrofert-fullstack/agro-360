# 14-scripts-base-de-datos

> Convertido desde `14-scripts-base-de-datos.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**14. Scripts de Base de Datos**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# Scripts SQL: orden de ejecución

Todos los scripts deben ejecutarse en el SQL Editor de Supabase Dashboard, en el orden indicado. Todos son idempotentes (IF NOT EXISTS / IF EXISTS), por lo que pueden reejecutarse sin riesgo.

|  |  |  |
| --- | --- | --- |
| **Orden** | **Archivo** | **Descripción** |
| 1 | scripts/001\_create\_schema.sql | Tablas base del sistema |
| 2 | scripts/002\_complete\_schema.sql | Ampliación de tablas y columnas adicionales |
| 3 | scripts/003\_complete\_agrosantander\_schema.sql | Esquema completo + políticas RLS + triggers |
| 4 | scripts/005\_public\_registros\_rls.sql | Políticas RLS para formulario público |
| 5 | supabase/migrations/20260309\_fecha\_nacimiento.sql | Añade beneficiarios.fecha\_nacimiento (DATE) |
| 6 | supabase/migrations/20260309\_migracion\_completa.sql | Estado default INICIADO, limpieza legacy, política UPDATE |
| 7 | supabase/migrations/20260422\_campos\_adicionales.sql | Contacto secundario, fotos adicionales, numero\_documento en profiles, rol analista |
| 8 | supabase/migrations/20260427\_rls\_completo.sql | RLS completo corregido, todas las tablas (usar este) |

# Notas Importantes

* El orden de ejecución importa: los scripts posteriores dependen de objetos creados en los anteriores.
* Si se ejecuta en una BD existente con datos, verificar que las migraciones sean idempotentes.
* Las políticas RLS son críticas para la seguridad: no deshabilitarlas en producción.
* Los triggers de Supabase para perfiles se crean en 003\_complete\_agrosantander\_schema.sql.
* El archivo 20260427\_rls\_completo.sql corrige la recursión infinita (error 42P17) usando SECURITY DEFINER.
