# Manual de Usuario — Agro360

**Sistema de Caracterización Predial Agropecuaria**
**Versión:** 1.0 — Entrega formal COA
**Fecha:** Abril 2026

---

## 1. Introducción

Agro360 es una aplicación web diseñada para que asesores técnicos agropecuarios caractericen predios rurales de Santander, Colombia. Los datos se capturan en línea y se envían directamente al servidor, generando un radicado oficial de inmediato.

### 1.1 Perfiles de usuario

La aplicación maneja cuatro perfiles:

| Perfil | Quién es | Qué puede hacer |
|---|---|---|
| **Agricultor / Productor** | Beneficiario del programa | Ver su caracterización, editar si fue rechazada, consultar estado |
| **Asesor técnico** | Funcionario de campo | Levantar caracterizaciones, cambiar estado a `REVISADO` |
| **Analista** | Evaluador crediticio | Cambiar estado a `EN_ESTUDIO_CREDITO`, `APROBADO`, `CANCELADO` |
| **Administrador** | Jefe / coordinador | Gestión completa de usuarios, caracterizaciones y estadísticas |

### 1.2 Navegadores soportados

- Google Chrome 100+ (recomendado)
- Microsoft Edge 100+
- Firefox 100+
- Safari 15+ (iOS y macOS)

**Requisitos mínimos:** 2 GB RAM, conexión a internet, acceso a cámara y GPS del dispositivo.

---

## 2. Acceso a la aplicación

### 2.1 URL de acceso

La aplicación está publicada en la URL proporcionada por el operador.

### 2.2 Iniciar sesión (asesor, analista, admin)

1. Abrir el navegador e ir a la URL de la aplicación.
2. Presionar **"Iniciar sesión"** en la parte superior.
3. Ingresar correo y contraseña entregados por el administrador.
4. Al entrar por primera vez, el sistema solicitará cambiar la contraseña.

### 2.3 Registro de agricultor

El agricultor puede crear su cuenta desde **"Registrarse"**:

1. Ir a `/registro` o presionar **"Registrarse"** en la página principal.
2. Completar: número de documento, correo, contraseña, nombre completo.
3. Aceptar términos y crear cuenta.
4. El sistema envía correo de confirmación.

### 2.4 Recuperar contraseña

1. En la pantalla de login, presionar **"¿Olvidaste tu contraseña?"**.
2. Ingresar el correo registrado.
3. Revisar bandeja de entrada (y spam) — llega un enlace para restablecer.

---

## 3. Uso para el Agricultor / Productor

### 3.1 Consultar mi caracterización

Tras iniciar sesión, el agricultor ve su **dashboard personal** con:

- **Estado actual** de su caracterización (Iniciado / Revisado / En estudio / Viable / No Viable).
- **Radicado oficial** asignado.
- **Botón "Ver detalles"** para ver todos los datos registrados.
- **Mapa** con la ubicación del predio.
- **Código QR** para verificación rápida.

### 3.2 Editar caracterización rechazada

Si el estado es **"No Viable"** (CANCELADO) o **"Rechazado"**, el agricultor puede crear una nueva caracterización:

1. Presionar **"Crear nueva caracterización"** desde el dashboard.
2. Completar el formulario (ver sección 4).
3. Enviar — la caracterización anterior permanece como registro histórico.

### 3.3 Llenar formulario sin login

Cualquier persona puede acceder a `/formulario` sin iniciar sesión. El formulario se envía directamente al servidor al completar el paso 9. El sistema asigna un radicado oficial de inmediato.

---

## 4. Formulario de Caracterización (9 pasos)

El formulario se divide en 9 pasos. Es obligatorio completar cada paso para avanzar. Se requiere conexión a internet para enviar el formulario.

### Paso 1 — Datos de la Visita

- **Fecha y hora de la visita** (se completa automáticamente con el día actual).
- **Nombre del técnico** (auto-llenado si el asesor inició sesión).
- **Código y versión del formulario** (solo lectura).
- **Departamento, municipio, corregimiento, vereda**.
- **Objetivo de la visita y observaciones**.

### Paso 2 — Datos del Beneficiario

- **Tipo y número de documento** (CC, CE, TI, Pasaporte, NIT).
- **Nombres completos**: primer nombre, segundo nombre, primer apellido, segundo apellido.
- **Edad, género, personas a cargo**.
- **Teléfono, correo electrónico**.
- **Ocupación principal**.
- **Contacto secundario**: nombre, teléfono, parentesco.

**Tip:** el correo es importante — es la vía para que el beneficiario reciba sus credenciales de acceso tras el registro.

### Paso 3 — Datos del Predio

- **Nombre del predio** (opcional).
- **Departamento, municipio, vereda, dirección, código catastral**.
- **Tipo de tenencia**: Propia / Posesión / Arrendamiento / Otro.
- **Documento de tenencia** (opcional).
- **Área total y área productiva** en hectáreas.
- **Cultivos existentes** (texto libre).
- **Altitud, coordenadas X/Y**.
- **Ubicación en el mapa**:
  - Presionar **"Ubicar en mapa"** → usa GPS del dispositivo.
  - O seleccionar **"Dibujar polígono"** para trazar el perímetro del predio manualmente.
- **¿Vive en el predio?** (Sí / No / Cerca).
- **¿Tiene vivienda en el predio?**.

### Paso 4 — Caracterización del Predio

- **Topografía**: 0–25% plana / 26–50% inclinada / 51%+ pendiente.
- **Tipo de suelo, erosión, drenaje, cobertura vegetal**.
- **Ruta de acceso, distancia (km), tiempo de acceso**.
- **Temperatura (°C), meses de lluvia**.
- **Cobertura** (checkboxes): bosque, cultivos, pastos, rastrojo.

### Paso 5 — Abastecimiento de Agua y Riesgos

**Fuentes de agua** (marcar las que apliquen):
- Nacimiento / manantial
- Río / quebrada
- Pozo
- Acueducto rural
- Canal de distrito de riego
- Jagüey / reservorio
- Agua lluvia
- Otra fuente (especificar)

**Disponibilidad y calidad del agua**, concesión de aguas.

**Riesgos identificados** (marcar): inundación, sequía, viento, helada, otros.

### Paso 6 — Área Productiva

- **Cultivo principal** y área en hectáreas.
- **Sistema productivo** (tecnificado / tradicional / mixto).
- **Estado del cultivo**: Tecnificado / En mal estado / NS/NR.
- **Ganado**: ¿tiene? tipo, cantidad.
- **Asistencia técnica, uso de agroquímicos**.
- **Infraestructura de procesamiento** (¿tiene? descripción).
- **Interés en el programa** (Sí / No).
- **Dónde comercializa, ingreso mensual por ventas**.

### Paso 7 — Información Financiera

- **Ingresos mensuales** agropecuarios y no agropecuarios (pesos colombianos).
- **Egresos mensuales**.
- **Activos totales y activos agropecuarios**.
- **Pasivos totales**.
- **Acceso a crédito**: entidad, monto.
- **Subsidios recibidos**: tipos.

### Paso 8 — Fotos y Firma

- **Foto del beneficiario** (rostro frontal).
- **Foto documento frontal** y **foto documento trasero**.
- **Foto del predio 1** y **foto del predio 2** (opcional pero recomendado).
- **Firma digital del productor** (pantalla táctil o mouse).

**Captura:** presionar el botón de cámara para tomar foto con el dispositivo. Se puede volver a capturar si sale borrosa.

### Paso 9 — Autorizaciones y Envío

- **Autorización de tratamiento de datos personales** (obligatoria).
- **Autorización de aviso de privacidad** (obligatoria).
- **Autorización de consulta de centrales de riesgo** (opcional).
- **Autorización de uso de imagen** (opcional).
- **Captcha** (Cloudflare Turnstile — solo si no hay sesión de asesor).
- **Botón "Enviar"** — envía los datos al servidor y genera el radicado oficial.

---

## 5. Registro exitoso

Tras enviar el formulario, el sistema muestra la pantalla de confirmación con:

- **Radicado oficial** asignado (código único de identificación).
- Confirmación de que los datos fueron recibidos por el servidor.
- Próximos pasos: revisión por técnico, notificación por correo, acceso con credenciales.

Si el beneficiario tiene correo registrado, recibirá un correo de bienvenida con sus credenciales de acceso (si no tenía cuenta previa).

---

## 6. Dashboard del Asesor

Tras iniciar sesión como asesor, se accede a `/dashboard` con:

- **Estadísticas**: total caracterizaciones registradas.
- **Botón "Nueva caracterización"** → abre el formulario.
- **Buscador** por radicado o nombre.
- **Lista de registros** con estado y fecha.

### 6.1 Ver detalle de una caracterización

Presionar una caracterización en la lista → se abre la vista detallada con:
- Todos los datos del formulario organizados por secciones.
- Mapa con la ubicación y polígono del predio.
- Botón **"Descargar PDF"** con ficha imprimible.
- Botón **"Descargar CSV"** para exportación masiva.
- Código QR.

### 6.2 Cambiar estado (asesor)

El asesor solo puede transicionar a `REVISADO`. Desde la vista detallada:
1. Presionar **"Cambiar estado"**.
2. Seleccionar `REVISADO`.
3. Confirmar.

---

## 7. Estados de la caracterización

| Estado | Significado |
|---|---|
| `INICIADO` | Recién registrado, pendiente de revisión |
| `REVISADO` | El asesor confirmó los datos |
| `EN_ESTUDIO_CREDITO` | El analista está evaluando |
| `APROBADO` → **"Viable"** | Aprobado para el programa |
| `CANCELADO` → **"No Viable"** | No aplica para el programa |

---

## 8. Configuración y perfil

- **Perfil** (`/profile`): ver y editar datos personales, cambiar contraseña.
- **Cerrar sesión**: menú superior derecho → **"Salir"**.

---

## 9. Preguntas frecuentes

**¿Puedo llenar el formulario en mi celular?**
Sí. La aplicación es responsive y funciona en móviles (Android / iOS).

**¿Qué pasa si se pierde internet durante el llenado?**
Los datos del formulario se conservan en la página mientras no se cierre el navegador. Recuperar la conexión y presionar "Enviar".

**¿Cómo sé si mi caracterización fue aprobada?**
El estado cambia a **"Viable"** en el dashboard. El agricultor recibe correo de notificación si el analista lo envía.

**¿Puedo modificar datos después de enviar?**
Solo el asesor y el administrador pueden editar una caracterización ya registrada. Desde la vista detallada → **"Editar"**.

**¿Qué hacer si la firma no se guarda?**
Asegurarse de haber trazado al menos una línea antes de presionar "Guardar firma". Si persiste, usar otro dispositivo con pantalla táctil.

---

## 10. Soporte

Para soporte técnico utilizar el canal operativo acordado con el operador. Consultar el **Documento de Soporte y Garantía** para términos, SLAs y horarios de atención.
