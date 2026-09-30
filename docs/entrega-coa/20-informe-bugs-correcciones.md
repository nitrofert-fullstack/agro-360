# 20-informe-bugs-correcciones

> Convertido desde `20-informe-bugs-correcciones.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**20. Informe de Bugs y Correcciones**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| **ID** | **Severidad** | **Descripción** | **Estado** | **Corrección aplicada** |
| BUG001 | Alta | Recursión infinita en políticas RLS de tabla profiles (error 42P17) | Corregido | Creada función SECURITY DEFINER get\_user\_role() / mi\_rol() para quebrar la recursión. |
| BUG002 | Alta | Build fallaba con error 'Can't resolve @prisma/client-runtime-utils' en Turbopack | Corregido | Cambiado generator de prisma-client (Prisma 7 beta) a prisma-client-js (estable). |
| BUG003 | Media | datasourceUrl en PrismaClientOptions causaba error TypeScript | Corregido | Migrado a patrón PrismaPg adapter. La URL se pasa al adapter, no al constructor del cliente. |
| BUG004 | Media | Formulario no avanzaba al paso siguiente si el campo firma quedaba vacío sin mensaje de error visible | Corregido | Agregada validación explícita con mensaje de error en paso 8 del formulario. |
| BUG005 | Baja | Fecha de emisión del formulario era editable cuando debería ser solo lectura | Corregido | Campo marcado como readOnly en el componente del formulario. |
| BUG006 | Media | refresh\_token\_not\_found generaba error en consola sin limpieza de sesión | Corregido | AuthContext detecta el evento y llama a supabase.auth.signOut() para limpiar el estado. |
| BUG007 | Baja | Puerto 3000 bloqueado por proceso anterior impedía iniciar next dev | Operacional | Matar proceso con kill PID o usar puerto alternativo (next dev -p 3001). |
