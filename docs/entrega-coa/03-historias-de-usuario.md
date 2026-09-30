# 03-historias-de-usuario

> Convertido desde `03-historias-de-usuario.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**03. Historias de Usuario**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# Formato

Como [ROL], quiero [ACCIÓN] para [BENEFICIO].

|  |  |  |  |
| --- | --- | --- | --- |
| **ID** | **Rol** | **Historia** | **Criterios de aceptación** |
| HU001 | Asesor | Llenar el formulario de caracterización de 9 pasos para registrar datos del productor en campo | El formulario valida cada paso antes de avanzar. Al enviar genera radicado oficial. |
| HU002 | Asesor | Ver el listado de mis caracterizaciones para hacer seguimiento | El dashboard muestra todas las caracterizaciones del asesor con estado y fecha. |
| HU003 | Asesor | Descargar ficha PDF de una caracterización para entregársela al productor | El PDF contiene todos los datos del formulario con logo y radicado. |
| HU004 | Asesor | Cambiar el estado a REVISADO para confirmar que verifiqué los datos | Solo puede transicionar a REVISADO. El cambio queda registrado con timestamp. |
| HU005 | Asesor | Capturar firma digital del productor para validar su consentimiento | La firma se captura en pantalla táctil o mouse y se almacena como imagen. |
| HU006 | Asesor | Capturar fotos del predio y beneficiario para evidenciar la visita | El sistema acepta fotos de cámara o galería, comprime si supera el umbral. |
| HU007 | Asesor | Ubicar el predio en mapa y dibujar su polígono para georreferenciarlo | El mapa captura GPS automáticamente o permite entrada manual. El polígono se guarda. |
| HU008 | Admin | Crear cuentas de asesores/analistas para que accedan al sistema | El admin invita por correo. El usuario recibe credenciales temporales. |
| HU009 | Admin | Ver estadísticas globales para supervisar el estado del programa | Panel muestra conteos por estado, municipio, asesor y tendencia temporal. |
| HU010 | Admin | Cambiar el estado de cualquier caracterización para gestionar el flujo | Admin puede hacer override a cualquier estado válido. |
| HU011 | Admin | Asignar o reasignar asesores a caracterizaciones para equilibrar la carga | La reasignación actualiza asesor\_id y queda registrada. |
| HU012 | Admin | Eliminar usuarios inactivos para mantener la base de datos limpia | La eliminación borra profile y auth.users. No aplica a admins. |
| HU013 | Admin | Exportar todas las caracterizaciones a CSV para análisis en Excel | El CSV incluye todos los campos relevantes en formato UTF-8. |
| HU014 | Analista | Ver todas las caracterizaciones para evaluarlas crediticiamente | El analista accede a listado completo con filtros por estado y municipio. |
| HU015 | Analista | Cambiar estado a EN\_ESTUDIO\_CREDITO para indicar evaluación en curso | Solo desde REVISADO. Queda registrado en la caracterización. |
| HU016 | Analista | Marcar como APROBADO o CANCELADO al terminar la evaluación | Solo desde EN\_ESTUDIO\_CREDITO. Admin también puede hacerlo. |
| HU017 | Agricultor | Ver el estado de mi caracterización para conocer el progreso | El dashboard muestra estado actual, radicado y QR de verificación. |
| HU018 | Agricultor | Crear nueva caracterización si la anterior fue rechazada | El botón aparece cuando estado = CANCELADO/RECHAZADO. La anterior queda histórica. |
| HU019 | Público | Llenar el formulario sin login para registrar mi predio | El formulario público requiere captcha en paso 9. Genera radicado inmediato. |
| HU020 | Agricultor | Registrarme con mi número de documento para acceder al sistema | La página /registro crea cuenta con rol agricultor. Requiere doc único. |
