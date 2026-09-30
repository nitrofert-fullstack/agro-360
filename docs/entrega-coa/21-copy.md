# 21-copy

> Convertido desde `21-copy.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**21. Manual de Usuario**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# 1. Introducción

Agro360 es una aplicación web para la caracterización predial agropecuaria en Santander. Permite registrar datos de productores y sus predios, gestionar el flujo de aprobación y consultar el estado de cada solicitud.

|  |  |  |
| --- | --- | --- |
| **Rol** | **Descripción** | **Acceso principal** |
| Agricultor/Productor | Beneficiario del programa | Ver su caracterización y estado |
| Asesor técnico | Funcionario de campo | Crear y gestionar caracterizaciones |
| Analista | Evaluador crediticio | Evaluar y cambiar estados crediticios |
| Administrador | Coordinador | Gestión completa del sistema |

# 2. Acceso

* Abrir el navegador e ir a la URL de la aplicación.
* https://agro-360.com/
  ![](data:image/png;base64...)
* Presionar 'Iniciar sesión' e ingresar las credenciales de acceso.
* ![](data:image/png;base64...)
* El sistema redirige al dashboard según el rol.
* ![](data:image/png;base64...)
* Cualquier usuario puede además iniciar el proceso de caracterización por su cuenta, desde el formulario público, sin necesidad de un asesor.
* Para ello, basta con seleccionar el botón “Iniciar caracterización”, disponible en la pantalla principal de la plataforma.
* ![](data:image/png;base64...)
* Esta acción redirige al formulario de caracterización, el cual podrá ser completado por el usuario de forma independiente.
* En el primer paso, el formulario solicita datos básicos de la visita. Este es el punto de partida de un proceso que comprende 9 pasos en total, cada uno orientado a recopilar la información necesaria para el registro completo de la caracterización.
* ![](data:image/png;base64...)
* En este primer paso la información solicitada es mínima y algunos campos se completan automáticamente. Al seleccionar el botón “Siguiente”, ubicado en la parte inferior derecha, el sistema avanza al segundo paso, donde se despliegan los campos de información personal del agricultor o beneficiario.
* ![](data:image/png;base64...)
* Una vez registrada la información del beneficiario, seleccione “Siguiente” para avanzar al tercer paso, donde se ingresan los datos del predio: información fundamental para los estudios de viabilidad de la solicitud.
* ![](data:image/png;base64...)
* ![](data:image/png;base64...)
* Este paso cuenta con herramientas de georreferenciación que permiten ubicar y delimitar el predio dentro del departamento de Santander.
* ![](data:image/png;base64...)
* Una vez marcado nuestro polígono, procederemos a darle clic al botón “Siguiente” del paso 3, lo cual nos llevará al paso 4 siempre y cuando todo se haya diligenciado correctamente en los 3 primeros pasos.
* El cuarto paso recopila información de acceso al predio: rutas, distancias y referencias que orientan a los asesores para llegar correctamente a la ubicación.
* ![](data:image/png;base64...)
* A continuación, el quinto paso aborda las fuentes hídricas y los factores de riesgo del entorno del predio: inundaciones, sequías, deslizamientos u otros. Estos datos son fundamentales para garantizar la seguridad del personal y la viabilidad del proyecto. Si no se identifican riesgos, seleccione el tipo de superficie y continúe.
* ![](data:image/png;base64...)
* El sexto paso corresponde al área productiva del predio. Se pide información sobre el sistema productivo actual o proyectado (cultivos, ganadería u otra actividad agropecuaria), único campo obligatorio de este paso.
* El séptimo paso recopila la información financiera del productor. Este paso es opcional y puede omitirse si el beneficiario no dispone de los datos en el momento de la visita.
* ![](data:image/png;base64...)
* En el octavo paso se cargan las fotografías y la firma del beneficiario, elementos requeridos para los procesos de verificación en centrales de riesgo, siempre que el agricultor haya otorgado su autorización y manifieste interés en acceder a financiación a través del programa.
* ![](data:image/png;base64...)
* ![](data:image/png;base64...)
* Para el proceso de la firma, esta podría ser cargada en caso de que se tenga previamente en formato PNG o JPG, haciendo clic en el respectivo botón de “cargar firma”, ubicado en la parte inferior izquierda o si bien no contamos con este requisito, podremos firmar con el mouse o con el dedo en caso de estar diligenciando el formulario desde un dispositivo móvil, para este proceso dibujamos dentro del recuadro y al finalizar el sistema detectará automáticamente la firma, tal como se muestra en la siguiente imagen.
* ![](data:image/png;base64...)
* En el noveno y último paso se presentan las políticas de tratamiento de datos y las autorizaciones del formulario. De las cuatro o cinco opciones disponibles, dos son de aceptación obligatoria para poder enviar la solicitud.
* ![](data:image/png;base64...)
* Dos de estas son de carácter obligatorio y si no son seleccionadas no se concederá acceso a guardar el registro, una vez aceptadas las condiciones obligatorias, se nos habilita el botón de “Guardar caracterización”, de la siguiente forma
* ![](data:image/png;base64...)
* Al completar el proceso, el sistema genera un número de radicado que puede conservarse como soporte de la solicitud. Adicionalmente, al correo electrónico registrado en la información del beneficiario se envían las credenciales de acceso a la plataforma.

# 3. Formulario de Caracterización (9 Pasos)

|  |  |  |
| --- | --- | --- |
| **Paso** | **Nombre** | **Datos principales** |
| 1 | Datos de la visita | Fecha, nombre técnico, municipio, vereda, objetivo |
| 2 | Datos del beneficiario | Documento, nombres, edad, género, teléfono, contacto secundario |
| 3 | Datos del predio | Ubicación, tipo de tenencia, área, coordenadas GPS, polígono en mapa |
| 4 | Caracterización del predio | Topografía, temperatura, meses de lluvia, cobertura vegetal |
| 5 | Agua y riesgos | Fuentes de agua, riesgos (inundación, sequía, etc.) |
| 6 | Área productiva | Cultivos, sistema productivo, comercialización, ingresos ventas |
| 7 | Información financiera | Ingresos, egresos, activos, pasivos |
| 8 | Fotos y firma | Foto beneficiario, documento (frontal/trasera), predio, firma digital |
| 9 | Autorizaciones y envío | Consentimientos legales, captcha (público), botón Enviar |

# 4. Estados de la Caracterización

|  |  |
| --- | --- |
| **Estado** | **Significado** |
| INICIADO | Recién registrado, pendiente de revisión por asesor |
| REVISADO | El asesor confirmó los datos |
| EN\_ESTUDIO\_CREDITO | El analista está evaluando la viabilidad crediticia |
| APROBADO / Viable | Aprobado para el programa |
| CANCELADO / No Viable | No aplica para el programa |

# 5. Preguntas Frecuentes

|  |  |
| --- | --- |
| **Pregunta** | **Respuesta** |
| ¿Puedo llenar el formulario en el celular? | Sí. La app es responsive y funciona en Android/iOS con Chrome o Safari. |
| ¿Qué hago si cometí un error al llenar el formulario? | Contacte a su asesor o al administrador del programa. Ellos pueden editar la caracterización y corregir los datos registrados. |
| ¿Cómo sé si mi caracterización fue aprobada? | El estado cambia a 'Viable' en el dashboard del agricultor. |
| ¿Puedo modificar datos después de enviar? | Solo el asesor y el administrador pueden editar una caracterización ya registrada. |
