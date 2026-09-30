# 02-requerimientos-funcionales-no-funcionales

> Convertido desde `02-requerimientos-funcionales-no-funcionales.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**02. Requerimientos Funcionales y No Funcionales**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# 1. Requerimientos Funcionales

|  |  |  |  |
| --- | --- | --- | --- |
| **ID** | **Descripción** | **Prioridad** | **Estado** |
| RF01 | El sistema permite registrar datos de beneficiarios agropecuarios | Alta | Implementado |
| RF02 | El sistema permite capturar datos del predio (ubicación, área, tenencia) | Alta | Implementado |
| RF03 | El formulario de caracterización tiene 9 pasos progresivos | Alta | Implementado |
| RF04 | El sistema genera un radicado oficial único (RAD-000XXX) al enviar | Alta | Implementado |
| RF05 | El sistema envía credenciales de acceso al beneficiario por correo | Alta | Implementado |
| RF06 | El cambio de estado sigue una matriz de transiciones según el rol | Alta | Implementado |
| RF07 | El sistema maneja 4 roles: admin, asesor, analista, agricultor | Alta | Implementado |
| RF08 | Cada rol accede a un dashboard personalizado | Alta | Implementado |
| RF09 | El sistema permite exportar caracterizaciones a PDF y CSV | Media | Implementado |
| RF10 | El administrador puede crear, editar y eliminar usuarios | Alta | Implementado |
| RF11 | El formulario captura fotos del beneficiario, documento y predio | Alta | Implementado |
| RF12 | El formulario captura la firma digital del productor | Alta | Implementado |
| RF13 | El asesor puede ubicar el predio en mapa y dibujar su polígono | Media | Implementado |
| RF14 | El sistema implementa captcha para formularios sin sesión | Alta | Implementado |
| RF15 | El administrador puede filtrar, buscar y paginar caracterizaciones | Alta | Implementado |
| RF16 | El sistema permite editar una caracterización ya registrada | Media | Implementado |
| RF17 | El sistema muestra estadísticas en el panel de administración | Media | Implementado |
| RF18 | El agricultor puede crear nueva caracterización si la anterior fue cancelada | Media | Implementado |
| RF19 | El administrador puede invitar usuarios por correo con credenciales temporales | Alta | Implementado |
| RF20 | El sistema genera código QR de verificación por caracterización | Baja | Implementado |
| RF21 | El sistema valida todos los datos en cliente y en servidor | Alta | Implementado |
| RF22 | El sistema permite recuperación de contraseña vía correo | Alta | Implementado |
| RF23 | El asesor puede reasignar una caracterización a otro asesor | Media | Implementado |
| RF24 | El sistema registra fotos del documento de identidad (frontal y trasera) | Media | Implementado |
| RF25 | El formulario puede ser enviado por el público sin autenticación | Alta | Implementado |

# 2. Requerimientos No Funcionales

|  |  |  |  |
| --- | --- | --- | --- |
| **ID** | **Categoría** | **Descripción** | **Meta** |
| RNF01 | Disponibilidad | El sistema debe estar disponible | ≥ 99.5% mensual |
| RNF02 | Rendimiento | Tiempo de respuesta en operaciones normales | < 3 segundos |
| RNF03 | Escalabilidad | Usuarios concurrentes soportados | ≥ 50 simultáneos |
| RNF04 | Seguridad | Todas las comunicaciones cifradas | HTTPS obligatorio |
| RNF05 | Seguridad | Sesiones con expiración automática | JWT ≤ 5 horas |
| RNF06 | Seguridad | Row Level Security en todas las tablas | RLS habilitado |
| RNF07 | Compatibilidad | Navegadores soportados | Chrome 100+, Firefox 100+, Edge 100+, Safari 15+ |
| RNF08 | Usabilidad | Compatible con dispositivos móviles | Responsive (Android/iOS) |
| RNF09 | Mantenibilidad | Respaldos automáticos de base de datos | Diarios (Supabase Pro) |
| RNF10 | Auditabilidad | Registro de timestamps en todas las tablas | created\_at / updated\_at |
| RNF11 | Portabilidad | Deploy sin servidor propio | Vercel + Supabase (PaaS) |
| RNF12 | Usabilidad | Formulario accesible sin cuenta de usuario | Formulario público |
