# Diccionario de Datos — Agro360

**Sistema de Caracterización Predial Agropecuaria**
**Versión:** 1.0 — Entrega formal COA
**Fecha:** Abril 2026

---

## 1. Introducción

Este documento describe el esquema relacional de la base de datos PostgreSQL gestionada por Supabase para Agro360. Incluye las tablas principales, sus columnas, tipos de dato, restricciones, claves foráneas, índices y políticas de Row Level Security (RLS).

**Base de datos:** PostgreSQL 15+
**Schema:** `public` (y `auth` de Supabase)
**Row Level Security:** habilitado en todas las tablas de `public`

---

## 2. Diagrama relacional (alto nivel)

```
auth.users  ─────┬─────→  profiles
                 │
                 └─────→  visitas (asesor_id)
                              │
                              └─────→  beneficiarios
                                           │
                                           ├─────→  informacion_financiera
                                           │
                                           └─────→  predios
                                                        │
                                                        ├─→ caracterizacion_predio (1:1)
                                                        ├─→ abastecimiento_agua
                                                        ├─→ riesgos_predio
                                                        └─→ area_productiva

caracterizaciones  ──→  visitas (id_visita)
                   ──→  beneficiarios (id_beneficiario)
                   ──→  predios (id_predio)

archivos           ──→  caracterizaciones

invitations        ──→  auth.users (invitado_por)
```

---

## 3. Tablas

### 3.1 `profiles`

Extiende `auth.users` con información de rol y estado.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | UUID | NO | — | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| `email` | VARCHAR(255) | SÍ | — | Correo electrónico |
| `nombre_completo` | VARCHAR(200) | SÍ | — | Nombre completo |
| `rol` | VARCHAR(50) | SÍ | `'asesor'` | CHECK IN (`'admin'`, `'asesor'`, `'agricultor'`, `'analista'`) |
| `numero_documento` | VARCHAR(20) | SÍ | — | Documento del usuario (clave para agricultores) |
| `telefono` | VARCHAR(20) | SÍ | — | Teléfono |
| `activo` | BOOLEAN | SÍ | TRUE | Si FALSE, no puede iniciar sesión |
| `created_at` | TIMESTAMPTZ | SÍ | NOW() | |
| `updated_at` | TIMESTAMPTZ | SÍ | NOW() | |

**Triggers:**
- `on_auth_user_created` → `handle_new_user()`: al crearse usuario en `auth.users`, inserta automáticamente en `profiles` con rol por defecto.

**Políticas RLS:**
- SELECT: propio usuario o admin.
- INSERT: propio usuario.
- UPDATE: propio usuario o admin.

---

### 3.2 `visitas`

Cada visita técnica realizada al predio.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `fecha_visita` | DATE | NO | — | Fecha de la visita |
| `nombre_tecnico` | VARCHAR(100) | NO | — | Técnico que realizó la visita |
| `codigo_formulario` | VARCHAR(50) | SÍ | — | Código del formulario |
| `version_formulario` | VARCHAR(20) | SÍ | `'1.0'` | Versión del formulario |
| `fecha_emision_formulario` | DATE | SÍ | — | Fecha de emisión del formato |
| `radicado_local` | VARCHAR(100) | SÍ | — | UNIQUE, asignado por cliente (`RAD-LOCAL-...`) |
| `radicado_oficial` | VARCHAR(50) | SÍ | — | UNIQUE, asignado por servidor (`RAD-000001`) |
| `estado` | VARCHAR(50) | SÍ | `'PENDIENTE_SINCRONIZACION'` | Estado legacy — hoy se usa `caracterizaciones.estado` |
| `asesor_id` | UUID | SÍ | — | FK → `auth.users(id)` |
| `created_at` | TIMESTAMPTZ | SÍ | NOW() | |
| `updated_at` | TIMESTAMPTZ | SÍ | NOW() | |

**Índices:**
- `idx_visitas_fecha`, `idx_visitas_asesor`, `idx_visitas_estado`, `idx_visitas_radicado_local`.

**Políticas RLS:**
- SELECT/UPDATE: propio asesor o admin.
- INSERT: solo con `asesor_id = auth.uid()`.
- DELETE: solo admin.

---

### 3.3 `beneficiarios`

Información personal del productor.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `id_visita` | UUID | SÍ | — | FK → `visitas(id)` ON DELETE CASCADE |
| `nombres` | VARCHAR(100) | NO | — | Nombres completos |
| `apellidos` | VARCHAR(100) | NO | — | Apellidos completos |
| `tipo_documento` | VARCHAR(10) | NO | — | CHECK IN (`'CC'`, `'CE'`, `'TI'`, `'PAS'`, `'NIT'`) |
| `numero_documento` | VARCHAR(20) | NO | — | Número de documento |
| `fecha_nacimiento` | DATE | SÍ | — | Fecha de nacimiento |
| `edad` | INTEGER | SÍ | — | Edad |
| `genero` | VARCHAR(20) | SÍ | — | Género |
| `personas_a_cargo` | INTEGER | SÍ | — | Número de personas a cargo |
| `telefono` | VARCHAR(20) | SÍ | — | Teléfono principal |
| `correo` | VARCHAR(100) | SÍ | — | Correo electrónico |
| `ocupacion_principal` | VARCHAR(100) | SÍ | — | Ocupación principal |
| `nombre_contacto_secundario` | VARCHAR(200) | SÍ | — | Nombre contacto secundario |
| `telefono_secundario` | VARCHAR(20) | SÍ | — | Teléfono del contacto |
| `parentesco_contacto_secundario` | VARCHAR(50) | SÍ | — | Relación del contacto |
| `created_at` | TIMESTAMPTZ | SÍ | NOW() | |
| `updated_at` | TIMESTAMPTZ | SÍ | NOW() | |

**Índices:** `idx_beneficiarios_documento`.

**Políticas RLS:** heredadas vía `id_visita` → `visitas.asesor_id` o admin.

---

### 3.4 `predios`

Información del predio rural.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `id_beneficiario` | UUID | NO | — | FK → `beneficiarios(id)` ON DELETE CASCADE |
| `nombre_predio` | VARCHAR(100) | SÍ | — | Nombre del predio |
| `departamento` | VARCHAR(50) | NO | `'Santander'` | Departamento |
| `municipio` | VARCHAR(50) | NO | — | Municipio |
| `vereda` | VARCHAR(50) | SÍ | — | Vereda |
| `direccion` | VARCHAR(200) | SÍ | — | Dirección |
| `codigo_catastral` | VARCHAR(50) | SÍ | — | Código catastral IGAC |
| `documento_tenencia` | VARCHAR(100) | SÍ | — | Documento de tenencia |
| `tipo_tenencia` | VARCHAR(50) | SÍ | — | CHECK IN (`'Propia'`, `'Posesion'`, `'Arriendo'`, `'Otro'`) |
| `tipo_tenencia_otro` | VARCHAR(50) | SÍ | — | Texto libre si tipo = Otro |
| `coordenada_x` | VARCHAR(50) | SÍ | — | Coordenada X (MAGNA-SIRGAS, opcional) |
| `coordenada_y` | VARCHAR(50) | SÍ | — | Coordenada Y |
| `latitud` | DECIMAL(10,8) | SÍ | — | Latitud GPS |
| `longitud` | DECIMAL(11,8) | SÍ | — | Longitud GPS |
| `altitud_msnm` | DECIMAL(8,2) | SÍ | — | Altitud metros sobre nivel del mar |
| `poligono` | JSONB | SÍ | — | Array de `[lat, lng]` del perímetro |
| `tipo_ubicacion` | VARCHAR(20) | SÍ | — | `'punto'` o `'poligono'` |
| `vive_en_predio` | VARCHAR(10) | SÍ | — | CHECK IN (`'Si'`, `'No'`, `'Cerca'`) |
| `tiene_vivienda` | BOOLEAN | SÍ | FALSE | Vivienda en el predio |
| `area_total_hectareas` | DECIMAL(10,2) | SÍ | — | Área total (ha) |
| `area_productiva_hectareas` | DECIMAL(10,2) | SÍ | — | Área cultivable (ha) |
| `cultivos_existentes` | TEXT | SÍ | — | Descripción texto libre |
| `created_at` | TIMESTAMPTZ | SÍ | NOW() | |
| `updated_at` | TIMESTAMPTZ | SÍ | NOW() | |

**Índices:** `idx_predios_municipio`.

**Políticas RLS:** cascada vía `beneficiarios → visitas → asesor_id` o admin.

---

### 3.5 `caracterizacion_predio`

Datos técnicos del predio (1:1 con `predios`).

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `id_predio` | UUID | NO | — | UNIQUE, FK → `predios(id)` ON DELETE CASCADE |
| `ruta_acceso` | TEXT | SÍ | — | Descripción de acceso |
| `distancia_km` | DECIMAL(6,2) | SÍ | — | Distancia desde cabecera (km) |
| `tiempo_acceso` | VARCHAR(50) | SÍ | — | Tiempo aproximado |
| `temperatura_celsius` | DECIMAL(4,1) | SÍ | — | Temperatura promedio |
| `meses_lluvia` | VARCHAR(100) | SÍ | — | Meses de lluvia |
| `topografia` | VARCHAR(50) | SÍ | — | CHECK IN (`'0-25% Plana'`, `'26-50% Inclinada'`, `'51%> Pendiente'`) |
| `cobertura_bosque` | BOOLEAN | SÍ | FALSE | |
| `cobertura_cultivos` | BOOLEAN | SÍ | FALSE | |
| `cobertura_pastos` | BOOLEAN | SÍ | FALSE | |
| `cobertura_rastrojo` | BOOLEAN | SÍ | FALSE | |
| `created_at` | TIMESTAMPTZ | SÍ | NOW() | |
| `updated_at` | TIMESTAMPTZ | SÍ | NOW() | |

---

### 3.6 `abastecimiento_agua`

Fuentes de abastecimiento de agua.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `id_predio` | UUID | NO | — | FK → `predios(id)` ON DELETE CASCADE |
| `nacimiento_manantial` | BOOLEAN | SÍ | FALSE | |
| `rio_quebrada` | BOOLEAN | SÍ | FALSE | |
| `pozo` | BOOLEAN | SÍ | FALSE | |
| `acueducto_rural` | BOOLEAN | SÍ | FALSE | |
| `canal_distrito_riego` | BOOLEAN | SÍ | FALSE | |
| `jaguey_reservorio` | BOOLEAN | SÍ | FALSE | |
| `agua_lluvia` | BOOLEAN | SÍ | FALSE | |
| `otra_fuente` | VARCHAR(100) | SÍ | — | Otra fuente (texto libre) |
| `created_at` | TIMESTAMPTZ | SÍ | NOW() | |

---

### 3.7 `riesgos_predio`

Riesgos identificados en el predio.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `id_predio` | UUID | NO | — | FK → `predios(id)` ON DELETE CASCADE |
| `inundacion` | BOOLEAN | SÍ | FALSE | |
| `sequia` | BOOLEAN | SÍ | FALSE | |
| `viento` | BOOLEAN | SÍ | FALSE | |
| `helada` | BOOLEAN | SÍ | FALSE | |
| `otros_riesgos` | TEXT | SÍ | — | Otros riesgos (texto libre) |
| `created_at` | TIMESTAMPTZ | SÍ | NOW() | |

---

### 3.8 `area_productiva`

Datos productivos del predio.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `id_predio` | UUID | NO | — | FK → `predios(id)` ON DELETE CASCADE |
| `sistema_productivo` | VARCHAR(100) | SÍ | — | Sistema productivo |
| `caracterizacion_cultivo` | TEXT | SÍ | — | Descripción del cultivo |
| `cantidad_produccion` | VARCHAR(100) | SÍ | — | Cantidad de producción |
| `estado_cultivo` | VARCHAR(50) | SÍ | — | CHECK IN (`'Tecnificado'`, `'En mal estado'`, `'NS/NR'`) |
| `tiene_infraestructura_procesamiento` | BOOLEAN | SÍ | FALSE | |
| `estructuras` | TEXT | SÍ | — | Descripción de estructuras |
| `interesado_programa` | BOOLEAN | SÍ | FALSE | Interés en el programa |
| `donde_comercializa` | TEXT | SÍ | — | Canales de comercialización |
| `ingreso_mensual_ventas` | DECIMAL(12,2) | SÍ | — | Ingreso mensual por ventas |
| `created_at` | TIMESTAMPTZ | SÍ | NOW() | |
| `updated_at` | TIMESTAMPTZ | SÍ | NOW() | |

---

### 3.9 `informacion_financiera`

Información financiera del beneficiario.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `id_beneficiario` | UUID | NO | — | FK → `beneficiarios(id)` ON DELETE CASCADE |
| `ingresos_mensuales_agropecuaria` | DECIMAL(12,2) | SÍ | — | Ingresos agropecuarios |
| `ingresos_mensuales_otros` | DECIMAL(12,2) | SÍ | — | Otros ingresos |
| `egresos_mensuales` | DECIMAL(12,2) | SÍ | — | Egresos mensuales |
| `activos_totales` | DECIMAL(15,2) | SÍ | — | Activos totales |
| `activos_agropecuaria` | DECIMAL(15,2) | SÍ | — | Activos agropecuarios |
| `pasivos_totales` | DECIMAL(15,2) | SÍ | — | Pasivos totales |
| `created_at` | TIMESTAMPTZ | SÍ | NOW() | |
| `updated_at` | TIMESTAMPTZ | SÍ | NOW() | |

---

### 3.10 `caracterizaciones`

Tabla central que relaciona visita + beneficiario + predio.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `id_visita` | UUID | NO | — | FK → `visitas(id)` ON DELETE CASCADE |
| `id_beneficiario` | UUID | NO | — | FK → `beneficiarios(id)` ON DELETE CASCADE |
| `id_predio` | UUID | NO | — | FK → `predios(id)` ON DELETE CASCADE |
| `estado` | VARCHAR(50) | SÍ | `'INICIADO'` | Estado actual (INICIADO, REVISADO, EN_ESTUDIO_CREDITO, APROBADO, CANCELADO) |
| `observaciones` | TEXT | SÍ | — | Observaciones generales |
| `foto_1_url` | VARCHAR(500) | SÍ | — | URL Storage de foto 1 del predio |
| `foto_2_url` | VARCHAR(500) | SÍ | — | URL Storage de foto 2 del predio |
| `foto_beneficiario_url` | VARCHAR(500) | SÍ | — | URL Storage de foto del productor |
| `foto_doc_frontal_url` | VARCHAR(500) | SÍ | — | URL Storage documento frontal |
| `foto_doc_trasera_url` | VARCHAR(500) | SÍ | — | URL Storage documento trasero |
| `firma_productor_url` | VARCHAR(500) | SÍ | — | URL Storage firma digital |
| `autorizacion_datos_personales` | BOOLEAN | SÍ | FALSE | Autorización tratamiento datos |
| `autorizacion_consulta_crediticia` | BOOLEAN | SÍ | FALSE | Autorización centrales de riesgo |
| `created_at` | TIMESTAMPTZ | SÍ | NOW() | |
| `updated_at` | TIMESTAMPTZ | SÍ | NOW() | |

**Índices:** `idx_caracterizaciones_visita`.

**Estados posibles:**

| Valor | Label UI | Descripción |
|---|---|---|
| `INICIADO` | "Iniciado" | Recién registrado |
| `REVISADO` | "Revisado" | Asesor confirmó |
| `EN_ESTUDIO_CREDITO` | "En estudio" | Analista evaluando |
| `APROBADO` | "Viable" | Aprobado para programa |
| `CANCELADO` | "No Viable" | No aplica |
| `SINCRONIZADO` (legacy) | — | Compatibilidad retro |
| `EN_REVISION` (legacy) | — | Compatibilidad retro |
| `RECHAZADO` (legacy) | — | Compatibilidad retro |

---

### 3.11 `archivos` *(definida pero no utilizada actualmente)*

Tabla de tracking de uploads definida en `scripts/002_complete_schema.sql`. La aplicación actual almacena las URLs directamente en columnas de `caracterizaciones` (`foto_1_url`, `foto_2_url`, `foto_beneficiario_url`, `foto_doc_frontal_url`, `foto_doc_trasera_url`, `firma_productor_url`), por lo que esta tabla no se usa en el flujo activo. Se conserva por compatibilidad y posible uso futuro.

| Columna | Tipo | Nullable | Descripción |
|---|---|---|---|
| `id` | UUID | NO | PK |
| `caracterizacion_id` | UUID | SÍ | FK → `caracterizaciones(id)` ON DELETE CASCADE |
| `tipo` | TEXT | NO | CHECK IN (`'firma'`, `'foto_productor'`, `'documento_adicional'`) |
| `nombre_archivo` | TEXT | NO | Nombre del archivo |
| `url` | TEXT | NO | URL pública o firmada |
| `size_bytes` | INTEGER | SÍ | Tamaño en bytes |
| `mime_type` | TEXT | SÍ | MIME type |
| `created_at` | TIMESTAMPTZ | SÍ | |

---

### 3.12 `sync_log` *(definida pero no utilizada actualmente)*

Tabla de log de registro en servidor. Definida en `scripts/002_complete_schema.sql` pero no se escribe desde el código actual.

| Columna | Tipo | Nullable | Descripción |
|---|---|---|---|
| `id` | UUID | NO | PK |
| `caracterizacion_id` | UUID | SÍ | FK → `caracterizaciones(id)` |
| `asesor_id` | UUID | SÍ | FK → `profiles(id)` |
| `estado` | TEXT | NO | CHECK IN (`'exitoso'`, `'fallido'`) |
| `radicado_generado` | TEXT | SÍ | |
| `error_mensaje` | TEXT | SÍ | |
| `metadata` | JSONB | SÍ | |
| `created_at` | TIMESTAMPTZ | SÍ | |

---

### 3.13 `invitations`

Tokens para invitar usuarios por correo.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `email` | VARCHAR(255) | NO | — | Correo invitado |
| `token` | VARCHAR(255) | NO | — | UNIQUE, token único |
| `rol` | VARCHAR(50) | SÍ | `'asesor'` | Rol a asignar |
| `invitado_por` | UUID | SÍ | — | FK → `auth.users(id)` |
| `usado` | BOOLEAN | SÍ | FALSE | Si ya se redimió |
| `expires_at` | TIMESTAMPTZ | NO | — | Expiración (24 h por defecto) |
| `created_at` | TIMESTAMPTZ | SÍ | NOW() | |

**Políticas RLS:**
- SELECT: admin o quien invitó.
- INSERT: solo admin o asesor.

---

## 4. Tipos enumerados (CHECK constraints)

| Tabla.columna | Valores permitidos |
|---|---|
| `profiles.rol` | `admin`, `asesor`, `agricultor`, `analista` |
| `beneficiarios.tipo_documento` | `CC`, `CE`, `TI`, `PAS`, `NIT` |
| `predios.tipo_tenencia` | `Propia`, `Posesion`, `Arriendo`, `Otro` |
| `predios.vive_en_predio` | `Si`, `No`, `Cerca` |
| `caracterizacion_predio.topografia` | `0-25% Plana`, `26-50% Inclinada`, `51%> Pendiente` |
| `area_productiva.estado_cultivo` | `Tecnificado`, `En mal estado`, `NS/NR` |

---

## 5. Funciones y triggers

### 5.1 `handle_new_user()`

Trigger en `auth.users` AFTER INSERT. Crea automáticamente la fila correspondiente en `profiles` con rol `'asesor'` por defecto (o el rol especificado en `raw_user_meta_data`).

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre_completo, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre_completo', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'rol', 'asesor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
```

### 5.2 `generar_radicado_oficial()`

Función PL/pgSQL que calcula el siguiente radicado oficial (`RAD-000001`, `RAD-000002`, ...). Se invoca desde el endpoint `/api/caracterizaciones` al crear una visita.

---

## 6. Storage Buckets (Supabase Storage)

| Bucket | Público | Contenido |
|---|---|---|
| `fotos-productores` | NO | Fotos de rostro de beneficiarios |
| `firmas` | NO | Firmas digitales (PNG) |
| `fotos-predios` | NO | Fotos del predio (hasta 2 por caracterización) |
| `documentos-identidad` | NO | Fotos frontal/trasera del documento |

Acceso controlado por políticas RLS de Storage. Las URLs firmadas tienen validez 1 hora (configurable).

---

## 7. Matriz de relaciones (cardinalidad)

| Origen | Relación | Destino |
|---|---|---|
| `auth.users` | 1:1 | `profiles` |
| `auth.users` (asesor) | 1:N | `visitas` |
| `visitas` | 1:N | `beneficiarios` |
| `beneficiarios` | 1:N | `predios` |
| `beneficiarios` | 1:1 | `informacion_financiera` |
| `predios` | 1:1 | `caracterizacion_predio` |
| `predios` | 1:N | `abastecimiento_agua` |
| `predios` | 1:N | `riesgos_predio` |
| `predios` | 1:N | `area_productiva` |
| `visitas` + `beneficiarios` + `predios` | 1:1 | `caracterizaciones` |
| `auth.users` (invitado_por) | 1:N | `invitations` |

---

## 9. Integridad referencial

- Todas las FK utilizan **ON DELETE CASCADE** salvo `visitas.asesor_id` (SET NULL implícito, el asesor puede eliminarse sin perder las visitas).
- Al eliminar una caracterización (admin) se eliminan en cascada: visita, beneficiario, predio y todas las sub-tablas.
- `beneficiarios.numero_documento` NO es UNIQUE porque un mismo beneficiario puede tener múltiples visitas/caracterizaciones en el tiempo.

---

## 10. Políticas de Row Level Security

Todas las tablas tienen RLS habilitado. Patrón general:

- **SELECT**: propio asesor (cadena `asesor_id = auth.uid()`) o `rol = 'admin'` o `rol = 'analista'`.
- **INSERT**: solo con cadena que garantice `asesor_id = auth.uid()`.
- **UPDATE**: propio asesor, admin o (para `caracterizaciones.estado`) analista.
- **DELETE**: solo admin.

Ver los archivos `scripts/003_complete_agrosantander_schema.sql` y `supabase/migrations/20260302_update_policies.sql` para el detalle completo de cada política.

---

## 11. Migraciones aplicadas

En el repositorio se conservan dos conjuntos de scripts SQL:

**`scripts/`** — esquema inicial (orden de ejecución):

1. `001_create_schema.sql` — tablas base.
2. `002_complete_schema.sql` — ampliación (incluye `predios.poligono`, `tipo_ubicacion`).
3. `003_complete_agrosantander_schema.sql` — esquema completo + RLS + triggers + funciones.
4. `004_insert_test_user_asesor.sql` — usuario de prueba (opcional).
5. `005_public_registros_rls.sql` — políticas para formulario público.

**`supabase/migrations/`** — cambios incrementales posteriores (orden por fecha):

6. `20260309_fecha_nacimiento.sql` — añade `beneficiarios.fecha_nacimiento` (DATE).
7. `20260309_migracion_completa.sql` — consolidación idempotente: asegura `caracterizaciones.estado` con default `INICIADO`, elimina `visitas.estado` legacy, elimina `beneficiarios.foto_url`, crea política UPDATE en `caracterizaciones`.
8. `20260422_campos_adicionales.sql` — consolida los campos agregados durante el desarrollo: contacto secundario en `beneficiarios`, `foto_beneficiario_url`/`foto_doc_frontal_url`/`foto_doc_trasera_url` en `caracterizaciones`, `numero_documento` en `profiles`, y rol `analista` en el CHECK constraint de `profiles.rol`. Idempotente.

> **Para un despliegue fresco:** ejecutar **scripts 001–005** en orden y luego las tres migraciones en `supabase/migrations/` por fecha. El resultado es el esquema completo vigente en producción.

---

## 12. Convenciones

- **UUID v4** como PK en todas las tablas (generación en BD).
- **TIMESTAMPTZ** (con zona horaria) para todos los timestamps.
- **DECIMAL** para valores monetarios y áreas (no `FLOAT`).
- **snake_case** en nombres de tabla y columna.
- **CHECK constraints** para enumerados pequeños (alternativa a tipos enum PostgreSQL).
- Estados en mayúsculas constantes (`INICIADO`, `REVISADO`, etc.), labels UI en español humano.

---

*Para ampliar el esquema, crear una nueva migración SQL con nombre `YYYYMMDD_<descripcion>.sql` en `supabase/migrations/` y actualizar este documento.*
