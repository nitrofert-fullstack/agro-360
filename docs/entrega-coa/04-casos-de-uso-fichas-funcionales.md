# 04-casos-de-uso-fichas-funcionales

> Convertido desde `04-casos-de-uso-fichas-funcionales.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**04. Casos de Uso / Fichas Funcionales**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

## CU01: Registrar Caracterización

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| ID | CU01 |
| Nombre | Registrar Caracterización |
| Actor principal | Asesor / Público |
| Sistema interactuante | Sistema Agro360 |
| Precondiciones | Ninguno |
| Requerimientos relacionados | RF01–RF13 |

### Flujo principal

* 1. Actor abre /formulario.
* 2. Completa 9 pasos.
* 3. Envía en paso 9.
* 4. Sistema valida captcha (si público).
* 5. Sistema inserta datos en BD.
* 6. Sistema genera radicado RAD-000XXX.
* 7. Sistema envía correo al beneficiario.
* 8. Muestra pantalla de confirmación.

### Postcondición

Radicado oficial generado, datos en BD, correo enviado.

## CU02: Autenticar Usuario

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| ID | CU02 |
| Nombre | Autenticar Usuario |
| Actor principal | Todos los roles |
| Sistema interactuante | Supabase Auth |
| Precondiciones | Credenciales válidas |
| Requerimientos relacionados | RF07 |

### Flujo principal

* 1. Usuario abre /auth/login.
* 2. Ingresa correo y contraseña.
* 3. Supabase valida y retorna JWT.
* 4. proxy.ts almacena sesión en cookie HttpOnly.
* 5. Redirige al dashboard según rol.

### Postcondición

Sesión activa, cookie JWT establecida.

## CU03: Cambiar Estado

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| ID | CU03 |
| Nombre | Cambiar Estado |
| Actor principal | Admin / Asesor / Analista |
| Sistema interactuante | Sistema |
| Precondiciones | Caracterización existente, sesión activa |
| Requerimientos relacionados | RF06 |

### Flujo principal

* 1. Actor abre /dashboard/caracterizacion/[id].
* 2. Presiona 'Cambiar estado'.
* 3. Selecciona el nuevo estado.
* 4. Sistema valida transición según matriz de roles.
* 5. Sistema actualiza BD.
* 6. (Opcional) Sistema envía correo al beneficiario.

### Postcondición

Estado actualizado, timestamp registrado.

## CU04: Gestionar Usuarios

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| ID | CU04 |
| Nombre | Gestionar Usuarios |
| Actor principal | Admin |
| Sistema interactuante | Sistema + Supabase Auth |
| Precondiciones | Sesión admin activa |
| Requerimientos relacionados | RF10, RF19 |

### Flujo principal

* 1. Admin abre /admin/usuarios.
* 2. Puede: invitar (correo+rol), cambiar rol, activar/suspender, eliminar.
* 3. Sistema ejecuta la operación vía service\_role\_key.
* 4. Actualiza profiles y auth.users en Supabase.

### Postcondición

Usuario creado/modificado/eliminado en auth.users y profiles.

## CU05: Exportar Reportes

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| ID | CU05 |
| Nombre | Exportar Reportes |
| Actor principal | Admin / Asesor |
| Sistema interactuante | Sistema |
| Precondiciones | Sesión activa |
| Requerimientos relacionados | RF09 |

### Flujo principal

* 1. Actor abre lista de caracterizaciones.
* 2. Presiona 'Descargar PDF' (individual) o 'Exportar CSV' (masivo).
* 3. Sistema genera el archivo.
* 4. Navegador descarga el archivo.

### Postcondición

Archivo descargado con datos completos.

## CU06: Recuperar Contraseña

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| ID | CU06 |
| Nombre | Recuperar Contraseña |
| Actor principal | Todos los roles |
| Sistema interactuante | Supabase Auth |
| Precondiciones | Correo registrado en el sistema |
| Requerimientos relacionados | RF22 |

### Flujo principal

* 1. Usuario presiona '¿Olvidaste tu contraseña?'.
* 2. Ingresa correo.
* 3. Supabase envía enlace de reset.
* 4. Usuario clic en enlace → /auth/callback.
* 5. Ingresa nueva contraseña.
* 6. Supabase actualiza auth.users.

### Postcondición

Contraseña actualizada, sesión renovada.
