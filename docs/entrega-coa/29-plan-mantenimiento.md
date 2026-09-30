# 29-plan-mantenimiento

> Convertido desde `29-plan-mantenimiento.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**29. Plan de Mantenimiento**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# 1. Tareas de Mantenimiento Recurrentes

|  |  |  |
| --- | --- | --- |
| **Frecuencia** | **Tarea** | **Responsable** |
| Diario | Revisar logs de Vercel por errores 5xx | Administrador |
| Semanal | Verificar espacio de Storage en Supabase | Administrador |
| Mensual | Actualizar dependencias de npm (pnpm update) | Desarrollador |
| Mensual | Revisar facturas de Vercel y Supabase | Administrador |
| Mensual | Verificar credenciales SMTP (enviar correo de prueba) | Administrador |
| Trimestral | Revisar y rotar claves de servicio si es necesario | Administrador + Desarrollador |
| Trimestral | Auditar usuarios activos e inactivos | Administrador |
| Semestral | Revisión de seguridad (dependencias, RLS, JWT) | Desarrollador |
| Anual | Evaluar plan de Vercel y Supabase según uso real | Administrador |

# 2. Proceso de Actualización de Código

* 1. Desarrollar cambio en rama feature/nombre-del-cambio.
* 2. Crear PR en GitHub → revisar diff y build de preview.
* 3. Ejecutar typecheck: npx tsc --noEmit.
* 4. Merge a main → Vercel redespliega automáticamente.
* 5. Verificar en producción que el cambio funciona correctamente.
* 6. Si hay migración SQL: aplicar en Supabase SQL Editor.

# 3. Proceso de Actualización de BD

* 1. Crear archivo SQL en supabase/migrations/YYYYMMDD\_descripcion.sql.
* 2. Probar en proyecto Supabase de staging.
* 3. Aplicar en producción vía Supabase SQL Editor.
* 4. Verificar que no haya errores en los logs.
* 5. Commit del archivo SQL al repositorio.
