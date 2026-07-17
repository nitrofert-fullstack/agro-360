# Alcance Funcional Final — Agro360

**Sistema de Caracterización Predial Agropecuaria**
**Versión:** 1.0 — Entrega formal COA
**Fecha:** Abril 2026

---

## 1. Objeto

Sistema web para la recolección, almacenamiento, análisis y gestión de caracterizaciones prediales agropecuarias de pequeños y medianos productores, orientado a la toma de decisiones en programas de apoyo rural en el departamento de Santander (Colombia).

## 2. Alcance general

El sistema cubre el **ciclo completo** de una caracterización:

1. **Captura en campo** por asesor técnico.
2. **Almacenamiento centralizado** en la nube (PostgreSQL + Storage).
3. **Revisión y análisis** por analistas crediticios.
4. **Consulta por el beneficiario** del estado de su caracterización.
5. **Administración** de usuarios, estados y reportes.

---

## 3. Módulos funcionales

### 3.1 Módulo de Autenticación y Usuarios

- Registro de usuarios con correo y contraseña.
- Inicio de sesión y cierre de sesión.
- Recuperación de contraseña vía correo.
- Invitación de usuarios por correo (rol admin/asesor).
- Cuatro roles: **admin**, **asesor**, **analista**, **agricultor**.
- Gestión de perfil: datos personales, cambio de contraseña.
- Manejo robusto de sesión (refresh automático, detección de token inválido).

### 3.2 Módulo de Caracterización (formulario de 9 pasos)

**Paso 1 — Datos de la visita**
- Fecha y hora (inicio/fin), nombre del técnico.
- Código, versión y fecha de emisión del formulario.
- Ubicación administrativa: departamento, municipio, corregimiento, vereda.
- Objetivo y observaciones.

**Paso 2 — Beneficiario**
- Tipo y número de documento (CC, CE, TI, PAS, NIT).
- Nombres y apellidos completos.
- Edad, género, personas a cargo.
- Teléfono, correo, ocupación principal.
- Contacto secundario (nombre, teléfono, parentesco).

**Paso 3 — Predio**
- Datos de ubicación administrativa + dirección + código catastral.
- Tipo de tenencia (propia, posesión, arriendo, otro) y documento.
- Área total y productiva (hectáreas).
- Coordenadas GPS (captura automática o manual).
- Dibujo de polígono del perímetro (opcional) o punto.
- Altitud, vivienda en el predio, cultivos existentes.

**Paso 4 — Caracterización del predio**
- Topografía (plana, inclinada, pendiente).
- Tipo de suelo, erosión, drenaje, cobertura vegetal.
- Ruta de acceso, distancia, tiempo de acceso.
- Temperatura promedio, meses de lluvia.
- Cobertura: bosque, cultivos, pastos, rastrojo.

**Paso 5 — Abastecimiento de agua y riesgos**
- Fuentes de agua (múltiple selección).
- Disponibilidad, calidad, concesión.
- Riesgos identificados (inundación, sequía, viento, helada, otros).

**Paso 6 — Área productiva**
- Cultivo principal, área, producción estimada, destino.
- Ganado (tipo, cantidad).
- Sistema productivo, asistencia técnica, uso de agroquímicos.
- Infraestructura de procesamiento.
- Interés en el programa, canales de comercialización.
- Ingreso mensual por ventas.

**Paso 7 — Información financiera**
- Ingresos (agropecuarios / otros).
- Egresos mensuales.
- Activos (totales / agropecuarios).
- Pasivos totales.
- Acceso a crédito: entidad, monto.
- Subsidios recibidos.

**Paso 8 — Fotos y firma**
- Foto del beneficiario (rostro).
- Fotos del documento (frontal y trasero).
- Fotos del predio (hasta 2).
- Firma digital del productor (pantalla táctil / mouse).
- Compresión automática de imágenes grandes.

**Paso 9 — Autorización**
- Autorización de tratamiento de datos personales (obligatoria).
- Autorización de aviso de privacidad (obligatoria).
- Autorización de consulta de centrales de riesgo (opcional).
- Autorización de uso de imagen (opcional).
- Envío al servidor.

### 3.3 Módulo de Dashboard del Asesor

- Resumen: total caracterizaciones registradas.
- Listado de registros en servidor.
- Buscador por radicado o nombre.
- Creación de nueva caracterización.
- Edición de caracterización existente.
- Descarga de ficha en PDF.
- Exportación a CSV.

### 3.4 Módulo de Dashboard del Agricultor

- Vista de su caracterización con estado actual.
- Radicado oficial asignado.
- Código QR de verificación.
- Mapa con la ubicación del predio.
- Posibilidad de crear nueva caracterización si la anterior fue cancelada/rechazada.
- Acceso solo a sus propios datos (por `numero_documento` o correo).

### 3.5 Módulo de Administración

**Gestión de usuarios (`/admin/usuarios`):**
- Listado con filtros por rol y estado.
- Invitación por correo.
- Cambio de rol.
- Desactivación / activación.
- Eliminación de usuario.

**Gestión de caracterizaciones (`/admin/caracterizaciones`):**
- Listado completo paginado.
- Filtros: estado, asesor, municipio, rango de fechas.
- Reasignación de asesor.
- Edición y eliminación.
- Cambio de estado con matriz de transiciones por rol.
- Descarga individual y masiva (PDF, CSV).

**Estadísticas (`/admin/estadisticas`):**
- Distribución por estado, municipio, asesor.
- Evolución temporal.
- Tasa de aprobación.
- Área total caracterizada.
- Exportación de reportes.

### 3.6 Módulo de Mapas

- Visor de mapas interactivo (Leaflet + OpenStreetMap).
- Visualización de polígonos y puntos de predios caracterizados.
- Herramientas de medición: círculo, rectángulo, polígono.
- Cálculo de área, perímetro, centroide.

### 3.7 Módulo de Estados y Flujo de Aprobación

Estados del proceso:

1. `INICIADO` — recién registrado.
2. `REVISADO` — asesor confirmó los datos.
3. `EN_ESTUDIO_CREDITO` — analista evaluando.
4. `APROBADO` ("Viable") — aprobado para el programa.
5. `CANCELADO` ("No Viable") — no aplica.

Transiciones permitidas por rol:

| Desde → Hasta | Admin | Asesor | Analista |
|---|---|---|---|
| INICIADO → REVISADO | ✅ | ✅ | ❌ |
| REVISADO → EN_ESTUDIO_CREDITO | ✅ | ❌ | ✅ |
| EN_ESTUDIO_CREDITO → APROBADO | ✅ | ❌ | ✅ |
| EN_ESTUDIO_CREDITO → CANCELADO | ✅ | ❌ | ✅ |
| (Cualquiera) — override | ✅ | ❌ | ❌ |

### 3.8 Módulo de Notificaciones por Correo

- Envío de correo de bienvenida con credenciales temporales (beneficiario sin cuenta).
- Confirmación de radicado para beneficiarios con cuenta existente.
- Invitación de usuarios por correo con enlace + token.
- Reintento automático en caso de fallo SMTP.
- Plantillas HTML personalizables.

### 3.9 Módulo de Seguridad

- Row Level Security (RLS) en todas las tablas.
- Cookies HttpOnly + Secure.
- Middleware de protección de rutas.
- Validación server-side de todos los inputs.
- Separación de claves públicas y de servicio.

---

## 4. Arquitectura resumida

| Componente | Tecnología |
|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Estilos | Tailwind CSS 4 + Radix UI (shadcn/ui) |
| Base de datos | PostgreSQL (Supabase) |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage (S3-compatible) |
| Hosting | Vercel (serverless + edge) |
| Correos | Nodemailer vía SMTP |
| Mapas | Leaflet + OpenStreetMap |

Ver **Manual Técnico y de Arquitectura** para detalles.

---

## 5. Entregables

1. **Código fuente** completo en repositorio Git privado.
2. **Aplicación desplegada** en Vercel con dominio configurado.
3. **Base de datos** Supabase configurada con migraciones aplicadas.
4. **Documentación** completa (este conjunto de documentos).
5. **Credenciales de administración** entregadas por canal seguro.
6. **Manuales** de usuario, administrador, técnico e instalación.
7. **Diccionario de datos** con esquema completo.

---

## 6. Fuera de alcance (No cubierto en esta versión)

- Aplicación nativa móvil (Android/iOS).
- Integración con sistemas externos (ERP, CRM, bancos).
- Reportes PDF/Excel avanzados con plantillas personalizadas — se entrega PDF básico y CSV.
- Workflow complejo de aprobación multi-nivel — se entrega flujo lineal simple.
- Módulo de georeferenciación catastral oficial (IGAC) — solo coordenadas GPS y polígonos manuales.
- Facturación o gestión financiera integrada.
- Soporte multi-idioma — solo español.
- Auditoría detallada (log de cambios por usuario) — solo timestamps `created_at` / `updated_at`.

---

## 7. Criterios de aceptación

La entrega se considera completa cuando:

- [x] La aplicación está desplegada en el dominio acordado.
- [x] Todos los roles pueden autenticarse correctamente.
- [x] Un asesor puede completar y registrar una caracterización de prueba.
- [x] Los correos transaccionales se entregan correctamente.
- [x] El administrador puede crear, editar y eliminar usuarios.
- [x] El administrador puede cambiar estados y gestionar caracterizaciones.
- [x] El agricultor puede consultar su caracterización.
- [x] Los respaldos automáticos están habilitados en Supabase.
- [x] La documentación está entregada al operador.
- [x] Se puede generar ficha PDF y exportar CSV.

---

## 8. Limitaciones conocidas

1. Firma digital requiere pantalla táctil o mouse.
2. Correos SMTP sin reintentos persistentes (reintento único tras 3 s).
3. Retención de logs de Vercel: 1 día (Hobby) / 7 días (Pro).
5. Sin encriptación adicional en base de datos (confía en Supabase/PostgreSQL).

---

*Documento sujeto a ajustes según validación final con el operador.*
