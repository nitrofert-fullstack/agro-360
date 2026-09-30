# 05-reglas-de-negocio

> Convertido desde `05-reglas-de-negocio.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**05. Reglas de Negocio**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# Reglas de Negocio — Agro360

|  |  |  |  |
| --- | --- | --- | --- |
| **ID** | **Regla** | **Alcance** | **Consecuencia de incumplimiento** |
| RN001 | Solo usuarios con rol 'asesor' o 'admin' y sesión activa pueden crear caracterizaciones con asignación de asesor\_id | Módulo Formulario | El campo asesor\_id queda null |
| RN002 | El formulario público puede ser enviado por cualquier persona sin autenticación | Módulo Formulario | Sin captcha válido el envío es rechazado |
| RN003 | Cada caracterización tiene exactamente un beneficiario, un predio y una visita asociados | Modelo de datos | Error de integridad referencial |
| RN004 | El estado inicial de toda caracterización nueva es INICIADO | Estados | El sistema asigna INICIADO automáticamente; no es seleccionable manualmente |
| RN005 | Las transiciones de estado siguen la matriz: INICIADO→REVISADO (asesor/admin), REVISADO→EN\_ESTUDIO\_CREDITO (analista/admin), EN\_ESTUDIO→APROBADO/CANCELADO (analista/admin), cualquier→cualquier (solo admin) | Estados | El API rechaza transiciones no autorizadas con HTTP 403 |
| RN006 | El radicado oficial tiene el formato RAD-000XXX (secuencial, cero-padded 6 dígitos) | Radicado | No se permiten duplicados; el sistema reintenta si hay colisión |
| RN007 | No se puede eliminar el propio usuario (admin) | Usuarios | El API retorna 400 con mensaje de error explícito |
| RN008 | No se puede suspender una cuenta con rol 'admin' | Usuarios | El API retorna 400 con mensaje de error explícito |
| RN009 | Las fotos se comprimen automáticamente si superan 10MB a calidad 0.8 / máx 1600px | Archivos | Sin compresión el servidor puede rechazar el payload por tamaño |
| RN010 | La firma digital es obligatoria para completar el formulario | Formulario | El paso 8 no avanza si no hay firma guardada |
| RN011 | La autorización de datos personales y de aviso de privacidad son obligatorias | Formulario | El paso 9 no permite enviar si no están marcadas |
| RN012 | El captcha Cloudflare Turnstile solo aplica cuando no hay JWT de asesor en la solicitud | Seguridad | Sin captcha válido el endpoint /api/caracterizaciones retorna 400 |
| RN013 | Un agricultor solo puede ver sus propias caracterizaciones, identificadas por numero\_documento | Privacidad | RLS en Supabase bloquea acceso a datos de otros beneficiarios |
| RN014 | Las claves de servicio (SUPABASE\_SERVICE\_ROLE\_KEY) solo se usan en el servidor | Seguridad | Exponer al cliente bypasearía RLS y comprometería todos los datos |
| RN015 | Las contraseñas temporales generadas al invitar usuarios tienen formato AgroXXXXXXXX! | Usuarios | El usuario debe cambiarla en el primer acceso |
