# 18-casos-de-prueba

> Convertido desde `18-casos-de-prueba.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**18. Casos de Prueba**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

|  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| **ID** | **Módulo** | **Descripción** | **Pasos** | **Resultado esperado** | **Estado** |
| PT001 | Formulario | Envío completo como asesor autenticado | 1.Login asesor 2.Abrir /formulario 3.Completar 9 pasos 4.Enviar | Radicado generado, datos en BD, correo al beneficiario | Pass |
| PT002 | Formulario | Envío público con captcha | 1.Sin login, abrir /formulario 2.Completar 3.Resolver captcha 4.Enviar | Radicado generado, asesor\_id=null | Pass |
| PT003 | Formulario | Validación paso obligatorio vacío | 1.Abrir /formulario 2.No llenar campos requeridos 3.Intentar avanzar | El sistema muestra errores de validación y no avanza | Pass |
| PT004 | Auth | Login con credenciales correctas | 1.Abrir /auth/login 2.Ingresar email y contraseña válidos 3.Enviar | Redirige al dashboard del rol correspondiente | Pass |
| PT005 | Auth | Login con contraseña incorrecta | 1.Abrir /auth/login 2.Ingresar contraseña incorrecta 3.Enviar | Mensaje de error, no hay redirección | Pass |
| PT006 | Estados | Transición INICIADO → REVISADO por asesor | 1.Login asesor 2.Abrir caracterización en INICIADO 3.Cambiar a REVISADO | Estado actualizado a REVISADO | Pass |
| PT007 | Estados | Transición inválida por rol | 1.Login asesor 2.Intentar cambiar a APROBADO | Error 403, estado no cambia | Pass |
| PT008 | Admin | Invitar nuevo usuario | 1.Login admin 2./admin/usuarios 3.Invitar con email y rol | Cuenta creada, correo con credenciales enviado | Pass |
| PT009 | PDF | Descargar ficha PDF | 1.Login asesor 2.Abrir caracterización 3.Descargar PDF | PDF descargado con todos los datos y radicado | Pass |
| PT010 | RLS | Acceso cruzado entre agricultores | 1.Login agricultor A 2.Intentar acceder a datos de agricultor B | Error 403 / datos no visibles | Pass |
| PT011 | Fotos | Captura y subida de foto del predio | 1.Login asesor 2.Paso 8 del formulario 3.Capturar foto 4.Enviar | URL de foto guardada en caracterizaciones.foto\_1\_url | Pass |
| PT012 | Firma | Captura de firma digital | 1.Login asesor 2.Paso 8 3.Dibujar firma 4.Guardar | URL de firma guardada en caracterizaciones.firma\_productor\_url | Pass |
| PT013 | Recuperación | Recuperar contraseña vía correo | 1.Olvidé contraseña 2.Ingresar email 3.Recibir correo 4.Cambiar contraseña | Nueva contraseña establecida, login exitoso | Pass |
| PT014 | CSV | Exportar caracterizaciones a CSV | 1.Login admin 2./admin/caracterizaciones 3.Exportar CSV | Archivo CSV descargado con todas las columnas | Pass |
| PT015 | Móvil | Formulario completo en celular Android | 1.Abrir /formulario en Chrome Android 2.Completar 3.Enviar | Formulario funcional, cámara accesible, envío exitoso | Pass |
