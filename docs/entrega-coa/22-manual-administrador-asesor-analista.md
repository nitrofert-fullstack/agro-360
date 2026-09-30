# 22-manual-administrador-asesor-analista

> Convertido desde `22-manual-administrador-asesor-analista.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**22. Manual de Administrador, Asesor y Analista**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

**PARTE I. MANUAL DEL ADMINISTRADOR**

# 1. Descripción del Rol

El Administrador es el usuario con mayor nivel de acceso en Agro360. Tiene control total sobre la plataforma: puede gestionar usuarios, supervisar todas las caracterizaciones, modificar estados, reasignar asesores y exportar información. Este rol está reservado para el coordinador del programa o el responsable técnico de la operación.

# 2. Acceso al Sistema

Para iniciar sesión como administrador, siga los siguientes pasos:

* Abra el navegador e ingrese a https://agro-360.com/
* Haga clic en el botón 'Iniciar sesión' de la pantalla principal.
* Ingrese su correo electrónico y contraseña asignados por el equipo técnico.
* El sistema verifica sus credenciales y lo redirige automáticamente al Panel de Administración (/admin).

![](data:image/png;base64...)

*![](data:image/png;base64...)*

# 3. Panel de Administración (/admin)

El panel de administración es el centro de control del sistema. Desde aquí el administrador puede acceder a todos los módulos disponibles:

|  |  |
| --- | --- |
| **Módulo** | **Descripción** |
| Usuarios | Gestión completa de cuentas, roles y estados de los usuarios del sistema |
| Caracterizaciones | Supervisión y gestión de todo el flujo de caracterizaciones |
| Mapa | Vista geográfica de todos los predios caracterizados en Santander |
| Estadísticas | Reportes y métricas generales del programa |

# *![](data:image/png;base64...)*

# 4. Gestión de Usuarios (/admin/usuarios)

Desde este módulo el administrador crea, modifica y elimina las cuentas de los demás usuarios del sistema.

**4.1 Invitar un Nuevo Usuario**

* En el panel, seleccione el módulo 'Usuarios'.
* Haga clic en el botón 'Invitar usuario'.
* Complete el formulario: nombre completo, correo electrónico, número de documento y rol (Asesor, Analista, Administrador o Campesino).
* Haga clic en 'Enviar invitación'.
* El sistema crea la cuenta y envía al correo del nuevo usuario sus credenciales de acceso.

*![](data:image/png;base64...)***4.2 Cambiar el Rol de un Usuario**

* Ubique al usuario en la lista.
* Haga clic en el menú de opciones (tres puntos) de la fila correspondiente.
* Seleccione 'Cambiar rol' y elija el nuevo rol en el desplegable.
* Confirme el cambio. El nuevo rol se aplica de inmediato en todo el sistema.

**4.3 Suspender o Activar un Usuario**

* Ubique al usuario en la lista.
* Haga clic en el toggle de la columna 'Estado' para suspenderlo o reactivarlo.
* Un usuario suspendido pierde el acceso al sistema de forma inmediata.

*Nota: La suspensión no aplica para usuarios con rol Administrador.*

**4.4 Eliminar un Usuario**

*Atención: Esta acción es irreversible. Se eliminarán permanentemente el perfil y la cuenta de autenticación del usuario.*

* En el menú de opciones del usuario, seleccione 'Eliminar'.
* Confirme la eliminación en el cuadro de diálogo.

# *![](data:image/png;base64...)*

# 5. Gestión de Caracterizaciones (/admin/caracterizaciones)

El administrador tiene visibilidad completa sobre todas las caracterizaciones registradas en el sistema.

**5.1 Buscar y Filtrar Caracterizaciones**

* Ingrese al módulo 'Caracterizaciones'.
* Use los filtros disponibles: estado, asesor asignado, municipio o rango de fechas.
* También puede buscar por número de radicado o nombre del beneficiario usando la barra de búsqueda.

*![](data:image/png;base64...)***5.2 Ver el Detalle de una Caracterización**

* Haga clic en cualquier fila del listado.
* Se abre la vista completa: datos del beneficiario, información del predio, polígono en el mapa, fotos y firma digital.
* Desde esta vista puede descargar el PDF imprimible de la ficha.

*![](data:image/png;base64...)***5.3 Cambiar el Estado de una Caracterización**

* En la vista de detalle, localice el campo 'Estado actual'.
* Haga clic en 'Cambiar estado' y seleccione el nuevo estado en el desplegable.
* Confirme el cambio. El estado se actualiza de inmediato.

El administrador puede cambiar a cualquier estado válido:

|  |  |
| --- | --- |
| **Estado** | **Significado** |
| INICIADO | Recién registrado, pendiente de revisión |
| REVISADO | Datos verificados por el asesor técnico |
| EN\_ESTUDIO\_CREDITO | Bajo evaluación crediticia por el analista |
| APROBADO / Viable | Aprobado para el programa |
| CANCELADO / No Viable | No cumple los requisitos del programa |

*![](data:image/png;base64...)***5.4 Reasignar Asesor**

* En la vista de detalle, haga clic en 'Reasignar asesor'.
* Seleccione el nuevo asesor del listado de asesores activos.
* Guarde el cambio.

**5.5 Exportar Datos**

* En el listado, aplique los filtros deseados.
* Haga clic en 'Exportar CSV'.
* El archivo se descarga automáticamente con todos los registros filtrados.

# 6. Vista del Mapa (/mapa)

El mapa permite visualizar geográficamente todos los predios caracterizados dentro del territorio de Santander.

* En el panel, seleccione 'Mapa'.
* Observe los puntos que representan cada predio registrado en el sistema.
* Haga clic sobre un punto para ver el resumen de la caracterización en un popup.
* Desde el popup puede acceder al detalle completo de la ficha.

# *![](data:image/png;base64...)*7. Preguntas Frecuentes - Administrador

|  |  |
| --- | --- |
| **Pregunta** | **Respuesta** |
| ¿Qué hacer si un asesor abandona la organización? | Suspenda su cuenta y reasigne sus caracterizaciones a otro asesor activo desde el módulo Usuarios. |
| ¿Puede el administrador editar el contenido de una caracterización? | Sí. Desde la vista de detalle puede modificar cualquier campo de la caracterización. |
| ¿Cómo se crean los buckets de almacenamiento? | Se crean automáticamente en la primera sincronización. No requieren acción manual. |
| ¿Dónde se cambia la duración de la sesión? | En el panel de Supabase: Authentication - Settings - JWT expiry. Valor recomendado: 18000 s (5 horas). |

**PARTE II. MANUAL DEL ASESOR**

# 1. Descripción del Rol

El Asesor técnico es el usuario de campo de Agro360. Su función principal es visitar los predios, registrar las caracterizaciones de los productores y enviar la información al sistema central. El asesor puede crear nuevas caracterizaciones, editarlas y marcarlas como revisadas para que pasen a evaluación por el analista.

# 2. Acceso al Sistema

Para iniciar sesión como asesor, siga los siguientes pasos:

* Abra el navegador e ingrese a https://agro-360.com/
* Haga clic en 'Iniciar sesión'.
* Ingrese su correo electrónico y contraseña (enviados por el administrador al crear su cuenta).
* El sistema lo redirige al Dashboard del Asesor (/dashboard).

![](data:image/png;base64...)

# 3. Dashboard del Asesor (/dashboard)

El dashboard es la pantalla principal del asesor. Desde aquí puede:

* Ver el listado completo de caracterizaciones registradas o asignadas.
* Consultar el estado actual de cada caracterización.
* Crear una nueva caracterización haciendo clic en el botón correspondiente.

# *![](data:image/png;base64...)*4. Crear una Nueva Caracterización

El formulario de caracterización consta de 9 pasos. A continuación se describe cada uno:

**Paso 1 - Datos de la Visita**

Información básica para identificar la visita de campo.

* Haga clic en 'Nueva caracterización' en el dashboard.
* El sistema autocompleta su nombre como técnico responsable (campo de solo lectura).
* Seleccione la fecha de la visita, el municipio y la vereda.
* Indique el objetivo de la visita.
* Haga clic en 'Siguiente'.

*![](data:image/png;base64...)***Paso 2 - Datos del Beneficiario**

Información personal del agricultor o productor.

* Ingrese el número de documento del beneficiario.
* Complete los campos: nombre, apellido, fecha de nacimiento, género y teléfono.
* Si el beneficiario autoriza, ingrese los datos del contacto secundario: nombre, parentesco y teléfono.
* Haga clic en 'Siguiente'.

![](data:image/png;base64...)**Paso 3 - Datos del Predio**

Ubicación y características básicas del predio.

* Ingrese el nombre o dirección del predio y el tipo de tenencia (propietario, arrendatario, etc.).
* Registre el área total del predio en hectáreas.
* Use el mapa interactivo para marcar la ubicación exacta o dibuje el polígono del predio sobre el territorio.
* Haga clic en 'Siguiente'.

![](data:image/png;base64...)**Paso 4 - Caracterización del Predio**

Condiciones ambientales y físicas del entorno.

* Seleccione el tipo de topografía: plana, ondulada o escarpada.
* Indique la temperatura promedio de la zona.
* Señale los meses de lluvia en el año.
* Describa la cobertura vegetal existente en el predio.
* Haga clic en 'Siguiente'.

![](data:image/png;base64...)**Paso 5 - Agua y Riesgos**

Fuentes de abastecimiento y factores de riesgo del entorno del predio.

* Seleccione las fuentes de agua disponibles: río, pozo, acueducto, lluvia, etc.
* Identifique los riesgos conocidos en el entorno: inundación, sequía, deslizamientos, entre otros.
* Si no hay riesgos identificados, seleccione el tipo de superficie y continúe.
* Haga clic en 'Siguiente'.

*![](data:image/png;base64...)***Paso 6 - Área Productiva**

Información sobre la actividad agropecuaria actual o proyectada del predio.

* Seleccione el sistema productivo: cultivos, ganadería, mixto u otro.
* Describa los cultivos existentes o la propuesta productiva del beneficiario.
* Indique el canal de comercialización principal.
* Registre los ingresos estimados por ventas si el beneficiario los conoce.
* Haga clic en 'Siguiente'.

![](data:image/png;base64...)**Paso 7 - Información Financiera**

Datos económicos del productor. Este paso no es obligatorio.

* Si el beneficiario dispone de la información, ingrese los ingresos mensuales: agropecuarios y otros.
* Registre los egresos mensuales estimados.
* Indique los activos y pasivos del productor si aplica.
* Si no cuenta con la información, haga clic en 'Siguiente' sin completar el paso.

![](data:image/png;base64...)**Paso 8 - Fotos y Firma**

Material gráfico requerido para el expediente.

* Cargue la foto del beneficiario (puede tomarla con la cámara del dispositivo).
* Suba la foto frontal y trasera del documento de identidad.
* Cargue una foto representativa del predio.
* Para la firma: cargue un archivo PNG o JPG existente, o firme directamente en el recuadro con el mouse o con el dedo en dispositivo táctil.
* Haga clic en 'Siguiente'.

![](data:image/png;base64...)

![](data:image/png;base64...)**Paso 9 - Autorizaciones y Envío**

Consentimientos legales y envío final de la caracterización.

* Lea las políticas y autorizaciones presentadas en pantalla.
* Marque las dos casillas obligatorias de consentimiento (requeridas para guardar).
* Haga clic en 'Guardar caracterización'.
* El sistema genera un número de radicado y registra la caracterización en el servidor.

*Nota: Si el formulario es enviado por un usuario no autenticado como asesor, el sistema solicita completar un captcha de seguridad antes de guardar.*

![](data:image/png;base64...)

# 5. Consultar y Gestionar Caracterizaciones

**5.1 Ver Mis Caracterizaciones**

* En el dashboard, consulte el listado de todas sus caracterizaciones.
* Use los filtros por estado o fecha para encontrar registros específicos.
* Haga clic en una fila para ver el detalle completo.

*![](data:image/png;base64...)***5.2 Editar una Caracterización**

El asesor puede editar una caracterización si su estado es INICIADO o REVISADO.

* Abra el detalle de la caracterización.
* Haga clic en el botón 'Editar'.
* Modifique los campos necesarios y guarde los cambios.

*Nota: Las caracterizaciones con estado CANCELADO no pueden editarse. El beneficiario puede crear un nuevo formulario si lo requiere.*

# 6. Marcar una Caracterización como Revisada

El estado REVISADO indica que el asesor ha validado la información y la caracterización está lista para evaluación crediticia por el analista.

* Abra el detalle de la caracterización que desea revisar.
* Verifique que todos los datos estén completos y correctos.
* Haga clic en 'Cambiar estado' y seleccione 'REVISADO'.
* Confirme el cambio.

# *![](data:image/png;base64...)*7. Preguntas Frecuentes - Asesor

|  |  |
| --- | --- |
| **Pregunta** | **Respuesta** |
| ¿Puedo llenar el formulario desde el celular? | Sí. La aplicación es responsive y compatible con Android e iOS en Chrome o Safari. |
| ¿Qué pasa si cierro el formulario a mitad? | Los datos se conservan mientras el navegador no se cierre. No cierre la pestaña hasta guardar el registro. |
| ¿Cuántas fotos puedo subir? | Una del beneficiario, dos del documento (frontal y trasera), una del predio y la firma digital. |
| ¿Puedo editar una caracterización ya guardada? | Sí, siempre que su estado sea INICIADO o REVISADO. Con estado CANCELADO no es posible editarla. |

**PARTE III. MANUAL DEL ANALISTA**

# 1. Descripción del Rol

El Analista es el evaluador crediticio del programa Agro360. Su función es revisar las caracterizaciones marcadas como REVISADO por el asesor, analizarlas desde el punto de vista financiero y productivo, y determinar su viabilidad para el programa. El analista puede cambiar el estado a EN\_ESTUDIO\_CREDITO, APROBADO (Viable) o CANCELADO (No Viable).

# 2. Acceso al Sistema

Para iniciar sesión como analista, siga los siguientes pasos:

* Abra el navegador e ingrese a https://agro-360.com/
* Haga clic en 'Iniciar sesión'.
* Ingrese su correo electrónico y contraseña.
* El sistema lo redirige al Dashboard del Analista (/dashboard).

![](data:image/png;base64...)

*![](data:image/png;base64...)*

# 3. Dashboard del Analista (/dashboard)

El dashboard del analista muestra el listado de todas las caracterizaciones del sistema. Desde aquí puede:

* Filtrar por estado, especialmente REVISADO y EN\_ESTUDIO\_CREDITO.
* Ver el resumen de cada ficha: nombre del beneficiario, municipio, asesor y fecha.
* Acceder al detalle completo de cualquier caracterización para su evaluación.

# *![](data:image/png;base64...)*4. Proceso de Evaluación

**4.1 Identificar Caracterizaciones para Revisar**

* En el dashboard, filtre por estado 'REVISADO'.
* Aparecerán las caracterizaciones que el asesor ya validó y están listas para evaluación.
* Haga clic en la caracterización que desea analizar.

*![](data:image/png;base64...)***4.2 Revisar el Detalle de la Caracterización**

* Revise la información del beneficiario: nombre, documento, contacto y fecha de nacimiento.
* Analice los datos del predio: ubicación, área, tipo de tenencia, topografía y sistema productivo.
* Revise la información financiera: ingresos, egresos, activos y pasivos del productor.
* Consulte las fotos del beneficiario, del predio y el documento de identidad.
* Verifique la firma digital y las autorizaciones otorgadas por el productor.
* ![](data:image/png;base64...)

*![](data:image/png;base64...)***4.3 Iniciar el Estudio de Crédito**

* En la vista de detalle, haga clic en 'Cambiar estado'.
* Seleccione 'EN\_ESTUDIO\_CREDITO'.
* Confirme el cambio.

Este estado indica que la caracterización está siendo formalmente evaluada. Ni el asesor ni el beneficiario pueden editarla mientras tenga este estado.

*![](data:image/png;base64...)*

**![](data:image/png;base64...)**

**![](data:image/png;base64...)**

**![](data:image/png;base64...)**

**4.4 Aprobar una Caracterización (Viable)**

* Concluido el análisis, haga clic en 'Cambiar estado'.
* Seleccione 'APROBADO'.
* Confirme el cambio.

El beneficiario verá en su dashboard el estado como 'Viable', indicando que ha sido aprobado para participar en el programa.

![](data:image/png;base64...)

*![](data:image/png;base64...)***4.5 Cancelar una Caracterización (No Viable)**

* Si la caracterización no cumple los requisitos, haga clic en 'Cambiar estado'.
* Seleccione 'CANCELADO'.
* Confirme el cambio.

El beneficiario verá el estado como 'No Viable'. Podrá consultar su ficha en modo de solo lectura y crear una nueva solicitud si lo desea.

![](data:image/png;base64...)

# *![](data:image/png;base64...)*5. Resumen de Permisos del Analista

|  |  |
| --- | --- |
| **Acción** | **¿Permitida?** |
| Ver todas las caracterizaciones | Sí |
| Filtrar por estado | Sí |
| Ver detalle completo (fotos, mapa, firma) | Sí |
| Cambiar estado a EN\_ESTUDIO\_CREDITO | Sí |
| Cambiar estado a APROBADO | Sí |
| Cambiar estado a CANCELADO | Sí |
| Cambiar estado a REVISADO | No (solo el asesor) |
| Editar datos de la caracterización | No (solo asesor y administrador) |
| Gestionar usuarios | No (solo el administrador) |
| ¿Cómo identifico una caracterización urgente? | Filtre por 'REVISADO' y ordene por fecha ascendente para atender primero las más antiguas. |
