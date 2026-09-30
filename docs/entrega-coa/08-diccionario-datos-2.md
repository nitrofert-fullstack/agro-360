# 08-diccionario-datos

> Convertido desde `08-diccionario-datos.docx`.

# Diccionario de Datos — Agro360

**Sistema de Caracterización Predial Agropecuaria** **Versión:** 1.0 — Entrega formal COA **Fecha:** Abril 2026

## 1. Introducción

Este documento describe el esquema relacional de la base de datos PostgreSQL gestionada por Supabase para Agro360. Incluye las tablas principales, sus columnas, tipos de dato, restricciones, claves foráneas, índices y políticas de Row Level Security (RLS).

**Base de datos:** PostgreSQL 15+ **Schema:** public (y auth de Supabase) **Row Level Security:** habilitado en todas las tablas de public

## 2. Diagrama relacional (alto nivel)

auth.users ─────┬─────→ profiles
 │
 └─────→ visitas (asesor\_id)
 │
 └─────→ beneficiarios
 │
 ├─────→ informacion\_financiera
 │
 └─────→ predios
 │
 ├─→ caracterizacion\_predio (1:1)
 ├─→ abastecimiento\_agua
 ├─→ riesgos\_predio
 └─→ area\_productiva

caracterizaciones ──→ visitas (id\_visita)
 ──→ beneficiarios (id\_beneficiario)
 ──→ predios (id\_predio)

archivos ──→ caracterizaciones

invitations ──→ auth.users (invitado\_por)

## 3. Tablas

### 3.1 profiles

Extiende auth.users con información de rol y estado.

| Columna | Tipo | Nullable | Default | Descripción |
| --- | --- | --- | --- | --- |
| id | UUID | NO | — | PK, FK → auth.users(id) ON DELETE CASCADE |
| email | VARCHAR(255) | SÍ | — | Correo electrónico |
| nombre\_completo | VARCHAR(200) | SÍ | — | Nombre completo |
| rol | VARCHAR(50) | SÍ | 'asesor' | CHECK IN ('admin', 'asesor', 'agricultor', 'analista') |
| numero\_documento | VARCHAR(20) | SÍ | — | Documento del usuario (clave para agricultores) |
| telefono | VARCHAR(20) | SÍ | — | Teléfono |
| activo | BOOLEAN | SÍ | TRUE | Si FALSE, no puede iniciar sesión |
| created\_at | TIMESTAMPTZ | SÍ | NOW() |  |
| updated\_at | TIMESTAMPTZ | SÍ | NOW() |  |

**Triggers:** - on\_auth\_user\_created → handle\_new\_user(): al crearse usuario en auth.users, inserta automáticamente en profiles con rol por defecto.

**Políticas RLS:** - SELECT: propio usuario o admin. - INSERT: propio usuario. - UPDATE: propio usuario o admin.

### 3.2 visitas

Cada visita técnica realizada al predio.

| Columna | Tipo | Nullable | Default | Descripción |
| --- | --- | --- | --- | --- |
| id | UUID | NO | gen\_random\_uuid() | PK |
| fecha\_visita | DATE | NO | — | Fecha de la visita |
| nombre\_tecnico | VARCHAR(100) | NO | — | Técnico que realizó la visita |
| codigo\_formulario | VARCHAR(50) | SÍ | — | Código del formulario |
| version\_formulario | VARCHAR(20) | SÍ | '1.0' | Versión del formulario |
| fecha\_emision\_formulario | DATE | SÍ | — | Fecha de emisión del formato |
| radicado\_local | VARCHAR(100) | SÍ | — | UNIQUE, asignado por cliente (RAD-LOCAL-...) |
| radicado\_oficial | VARCHAR(50) | SÍ | — | UNIQUE, asignado por servidor (RAD-000001) |
| estado | VARCHAR(50) | SÍ | 'PENDIENTE\_SINCRONIZACION' | Estado legacy — hoy se usa caracterizaciones.estado |
| asesor\_id | UUID | SÍ | — | FK → auth.users(id) |
| created\_at | TIMESTAMPTZ | SÍ | NOW() |  |
| updated\_at | TIMESTAMPTZ | SÍ | NOW() |  |

**Índices:** - idx\_visitas\_fecha, idx\_visitas\_asesor, idx\_visitas\_estado, idx\_visitas\_radicado\_local.

**Políticas RLS:** - SELECT/UPDATE: propio asesor o admin. - INSERT: solo con asesor\_id = auth.uid(). - DELETE: solo admin.

### 3.3 beneficiarios

Información personal del productor.

| Columna | Tipo | Nullable | Default | Descripción |
| --- | --- | --- | --- | --- |
| id | UUID | NO | gen\_random\_uuid() | PK |
| id\_visita | UUID | SÍ | — | FK → visitas(id) ON DELETE CASCADE |
| nombres | VARCHAR(100) | NO | — | Nombres completos |
| apellidos | VARCHAR(100) | NO | — | Apellidos completos |
| tipo\_documento | VARCHAR(10) | NO | — | CHECK IN ('CC', 'CE', 'TI', 'PAS', 'NIT') |
| numero\_documento | VARCHAR(20) | NO | — | Número de documento |
| fecha\_nacimiento | DATE | SÍ | — | Fecha de nacimiento |
| edad | INTEGER | SÍ | — | Edad |
| genero | VARCHAR(20) | SÍ | — | Género |
| personas\_a\_cargo | INTEGER | SÍ | — | Número de personas a cargo |
| telefono | VARCHAR(20) | SÍ | — | Teléfono principal |
| correo | VARCHAR(100) | SÍ | — | Correo electrónico |
| ocupacion\_principal | VARCHAR(100) | SÍ | — | Ocupación principal |
| nombre\_contacto\_secundario | VARCHAR(200) | SÍ | — | Nombre contacto secundario |
| telefono\_secundario | VARCHAR(20) | SÍ | — | Teléfono del contacto |
| parentesco\_contacto\_secundario | VARCHAR(50) | SÍ | — | Relación del contacto |
| created\_at | TIMESTAMPTZ | SÍ | NOW() |  |
| updated\_at | TIMESTAMPTZ | SÍ | NOW() |  |

**Índices:** idx\_beneficiarios\_documento.

**Políticas RLS:** heredadas vía id\_visita → visitas.asesor\_id o admin.

### 3.4 predios

Información del predio rural.

| Columna | Tipo | Nullable | Default | Descripción |
| --- | --- | --- | --- | --- |
| id | UUID | NO | gen\_random\_uuid() | PK |
| id\_beneficiario | UUID | NO | — | FK → beneficiarios(id) ON DELETE CASCADE |
| nombre\_predio | VARCHAR(100) | SÍ | — | Nombre del predio |
| departamento | VARCHAR(50) | NO | 'Santander' | Departamento |
| municipio | VARCHAR(50) | NO | — | Municipio |
| vereda | VARCHAR(50) | SÍ | — | Vereda |
| direccion | VARCHAR(200) | SÍ | — | Dirección |
| codigo\_catastral | VARCHAR(50) | SÍ | — | Código catastral IGAC |
| documento\_tenencia | VARCHAR(100) | SÍ | — | Documento de tenencia |
| tipo\_tenencia | VARCHAR(50) | SÍ | — | CHECK IN ('Propia', 'Posesion', 'Arriendo', 'Otro') |
| tipo\_tenencia\_otro | VARCHAR(50) | SÍ | — | Texto libre si tipo = Otro |
| coordenada\_x | VARCHAR(50) | SÍ | — | Coordenada X (MAGNA-SIRGAS, opcional) |
| coordenada\_y | VARCHAR(50) | SÍ | — | Coordenada Y |
| latitud | DECIMAL(10,8) | SÍ | — | Latitud GPS |
| longitud | DECIMAL(11,8) | SÍ | — | Longitud GPS |
| altitud\_msnm | DECIMAL(8,2) | SÍ | — | Altitud metros sobre nivel del mar |
| poligono | JSONB | SÍ | — | Array de [lat, lng] del perímetro |
| tipo\_ubicacion | VARCHAR(20) | SÍ | — | 'punto' o 'poligono' |
| vive\_en\_predio | VARCHAR(10) | SÍ | — | CHECK IN ('Si', 'No', 'Cerca') |
| tiene\_vivienda | BOOLEAN | SÍ | FALSE | Vivienda en el predio |
| area\_total\_hectareas | DECIMAL(10,2) | SÍ | — | Área total (ha) |
| area\_productiva\_hectareas | DECIMAL(10,2) | SÍ | — | Área cultivable (ha) |
| cultivos\_existentes | TEXT | SÍ | — | Descripción texto libre |
| created\_at | TIMESTAMPTZ | SÍ | NOW() |  |
| updated\_at | TIMESTAMPTZ | SÍ | NOW() |  |

**Índices:** idx\_predios\_municipio.

**Políticas RLS:** cascada vía beneficiarios → visitas → asesor\_id o admin.

### 3.5 caracterizacion\_predio

Datos técnicos del predio (1:1 con predios).

| Columna | Tipo | Nullable | Default | Descripción |
| --- | --- | --- | --- | --- |
| id | UUID | NO | gen\_random\_uuid() | PK |
| id\_predio | UUID | NO | — | UNIQUE, FK → predios(id) ON DELETE CASCADE |
| ruta\_acceso | TEXT | SÍ | — | Descripción de acceso |
| distancia\_km | DECIMAL(6,2) | SÍ | — | Distancia desde cabecera (km) |
| tiempo\_acceso | VARCHAR(50) | SÍ | — | Tiempo aproximado |
| temperatura\_celsius | DECIMAL(4,1) | SÍ | — | Temperatura promedio |
| meses\_lluvia | VARCHAR(100) | SÍ | — | Meses de lluvia |
| topografia | VARCHAR(50) | SÍ | — | CHECK IN ('0-25% Plana', '26-50% Inclinada', '51%> Pendiente') |
| cobertura\_bosque | BOOLEAN | SÍ | FALSE |  |
| cobertura\_cultivos | BOOLEAN | SÍ | FALSE |  |
| cobertura\_pastos | BOOLEAN | SÍ | FALSE |  |
| cobertura\_rastrojo | BOOLEAN | SÍ | FALSE |  |
| created\_at | TIMESTAMPTZ | SÍ | NOW() |  |
| updated\_at | TIMESTAMPTZ | SÍ | NOW() |  |

### 3.6 abastecimiento\_agua

Fuentes de abastecimiento de agua.

| Columna | Tipo | Nullable | Default | Descripción |
| --- | --- | --- | --- | --- |
| id | UUID | NO | gen\_random\_uuid() | PK |
| id\_predio | UUID | NO | — | FK → predios(id) ON DELETE CASCADE |
| nacimiento\_manantial | BOOLEAN | SÍ | FALSE |  |
| rio\_quebrada | BOOLEAN | SÍ | FALSE |  |
| pozo | BOOLEAN | SÍ | FALSE |  |
| acueducto\_rural | BOOLEAN | SÍ | FALSE |  |
| canal\_distrito\_riego | BOOLEAN | SÍ | FALSE |  |
| jaguey\_reservorio | BOOLEAN | SÍ | FALSE |  |
| agua\_lluvia | BOOLEAN | SÍ | FALSE |  |
| otra\_fuente | VARCHAR(100) | SÍ | — | Otra fuente (texto libre) |
| created\_at | TIMESTAMPTZ | SÍ | NOW() |  |

### 3.7 riesgos\_predio

Riesgos identificados en el predio.

| Columna | Tipo | Nullable | Default | Descripción |
| --- | --- | --- | --- | --- |
| id | UUID | NO | gen\_random\_uuid() | PK |
| id\_predio | UUID | NO | — | FK → predios(id) ON DELETE CASCADE |
| inundacion | BOOLEAN | SÍ | FALSE |  |
| sequia | BOOLEAN | SÍ | FALSE |  |
| viento | BOOLEAN | SÍ | FALSE |  |
| helada | BOOLEAN | SÍ | FALSE |  |
| otros\_riesgos | TEXT | SÍ | — | Otros riesgos (texto libre) |
| created\_at | TIMESTAMPTZ | SÍ | NOW() |  |

### 3.8 area\_productiva

Datos productivos del predio.

| Columna | Tipo | Nullable | Default | Descripción |
| --- | --- | --- | --- | --- |
| id | UUID | NO | gen\_random\_uuid() | PK |
| id\_predio | UUID | NO | — | FK → predios(id) ON DELETE CASCADE |
| sistema\_productivo | VARCHAR(100) | SÍ | — | Sistema productivo |
| caracterizacion\_cultivo | TEXT | SÍ | — | Descripción del cultivo |
| cantidad\_produccion | VARCHAR(100) | SÍ | — | Cantidad de producción |
| estado\_cultivo | VARCHAR(50) | SÍ | — | CHECK IN ('Tecnificado', 'En mal estado', 'NS/NR') |
| tiene\_infraestructura\_procesamiento | BOOLEAN | SÍ | FALSE |  |
| estructuras | TEXT | SÍ | — | Descripción de estructuras |
| interesado\_programa | BOOLEAN | SÍ | FALSE | Interés en el programa |
| donde\_comercializa | TEXT | SÍ | — | Canales de comercialización |
| ingreso\_mensual\_ventas | DECIMAL(12,2) | SÍ | — | Ingreso mensual por ventas |
| created\_at | TIMESTAMPTZ | SÍ | NOW() |  |
| updated\_at | TIMESTAMPTZ | SÍ | NOW() |  |

### 3.9 informacion\_financiera

Información financiera del beneficiario.

| Columna | Tipo | Nullable | Default | Descripción |
| --- | --- | --- | --- | --- |
| id | UUID | NO | gen\_random\_uuid() | PK |
| id\_beneficiario | UUID | NO | — | FK → beneficiarios(id) ON DELETE CASCADE |
| ingresos\_mensuales\_agropecuaria | DECIMAL(12,2) | SÍ | — | Ingresos agropecuarios |
| ingresos\_mensuales\_otros | DECIMAL(12,2) | SÍ | — | Otros ingresos |
| egresos\_mensuales | DECIMAL(12,2) | SÍ | — | Egresos mensuales |
| activos\_totales | DECIMAL(15,2) | SÍ | — | Activos totales |
| activos\_agropecuaria | DECIMAL(15,2) | SÍ | — | Activos agropecuarios |
| pasivos\_totales | DECIMAL(15,2) | SÍ | — | Pasivos totales |
| created\_at | TIMESTAMPTZ | SÍ | NOW() |  |
| updated\_at | TIMESTAMPTZ | SÍ | NOW() |  |

### 3.10 caracterizaciones

Tabla central que relaciona visita + beneficiario + predio.

| Columna | Tipo | Nullable | Default | Descripción |
| --- | --- | --- | --- | --- |
| id | UUID | NO | gen\_random\_uuid() | PK |
| id\_visita | UUID | NO | — | FK → visitas(id) ON DELETE CASCADE |
| id\_beneficiario | UUID | NO | — | FK → beneficiarios(id) ON DELETE CASCADE |
| id\_predio | UUID | NO | — | FK → predios(id) ON DELETE CASCADE |
| estado | VARCHAR(50) | SÍ | 'INICIADO' | Estado actual (INICIADO, REVISADO, EN\_ESTUDIO\_CREDITO, APROBADO, CANCELADO) |
| observaciones | TEXT | SÍ | — | Observaciones generales |
| foto\_1\_url | VARCHAR(500) | SÍ | — | URL Storage de foto 1 del predio |
| foto\_2\_url | VARCHAR(500) | SÍ | — | URL Storage de foto 2 del predio |
| foto\_beneficiario\_url | VARCHAR(500) | SÍ | — | URL Storage de foto del productor |
| foto\_doc\_frontal\_url | VARCHAR(500) | SÍ | — | URL Storage documento frontal |
| foto\_doc\_trasera\_url | VARCHAR(500) | SÍ | — | URL Storage documento trasero |
| firma\_productor\_url | VARCHAR(500) | SÍ | — | URL Storage firma digital |
| autorizacion\_datos\_personales | BOOLEAN | SÍ | FALSE | Autorización tratamiento datos |
| autorizacion\_consulta\_crediticia | BOOLEAN | SÍ | FALSE | Autorización centrales de riesgo |
| created\_at | TIMESTAMPTZ | SÍ | NOW() |  |
| updated\_at | TIMESTAMPTZ | SÍ | NOW() |  |

**Índices:** idx\_caracterizaciones\_visita.

**Estados posibles:**

| Valor | Label UI | Descripción |
| --- | --- | --- |
| INICIADO | “Iniciado” | Recién registrado |
| REVISADO | “Revisado” | Asesor confirmó |
| EN\_ESTUDIO\_CREDITO | “En estudio” | Analista evaluando |
| APROBADO | “Viable” | Aprobado para programa |
| CANCELADO | “No Viable” | No aplica |
| SINCRONIZADO (legacy) | — | Compatibilidad retro |
| EN\_REVISION (legacy) | — | Compatibilidad retro |
| RECHAZADO (legacy) | — | Compatibilidad retro |

### 3.11 archivos *(definida pero no utilizada actualmente)*

Tabla de tracking de uploads definida en scripts/002\_complete\_schema.sql. La aplicación actual almacena las URLs directamente en columnas de caracterizaciones (foto\_1\_url, foto\_2\_url, foto\_beneficiario\_url, foto\_doc\_frontal\_url, foto\_doc\_trasera\_url, firma\_productor\_url), por lo que esta tabla no se usa en el flujo activo. Se conserva por compatibilidad y posible uso futuro.

| Columna | Tipo | Nullable | Descripción |
| --- | --- | --- | --- |
| id | UUID | NO | PK |
| caracterizacion\_id | UUID | SÍ | FK → caracterizaciones(id) ON DELETE CASCADE |
| tipo | TEXT | NO | CHECK IN ('firma', 'foto\_productor', 'documento\_adicional') |
| nombre\_archivo | TEXT | NO | Nombre del archivo |
| url | TEXT | NO | URL pública o firmada |
| size\_bytes | INTEGER | SÍ | Tamaño en bytes |
| mime\_type | TEXT | SÍ | MIME type |
| created\_at | TIMESTAMPTZ | SÍ |  |

### 3.12 sync\_log *(definida pero no utilizada actualmente)*

Tabla de log de registro en servidor. Definida en scripts/002\_complete\_schema.sql pero no se escribe desde el código actual.

| Columna | Tipo | Nullable | Descripción |
| --- | --- | --- | --- |
| id | UUID | NO | PK |
| caracterizacion\_id | UUID | SÍ | FK → caracterizaciones(id) |
| asesor\_id | UUID | SÍ | FK → profiles(id) |
| estado | TEXT | NO | CHECK IN ('exitoso', 'fallido') |
| radicado\_generado | TEXT | SÍ |  |
| error\_mensaje | TEXT | SÍ |  |
| metadata | JSONB | SÍ |  |
| created\_at | TIMESTAMPTZ | SÍ |  |

### 3.13 invitations

Tokens para invitar usuarios por correo.

| Columna | Tipo | Nullable | Default | Descripción |
| --- | --- | --- | --- | --- |
| id | UUID | NO | gen\_random\_uuid() | PK |
| email | VARCHAR(255) | NO | — | Correo invitado |
| token | VARCHAR(255) | NO | — | UNIQUE, token único |
| rol | VARCHAR(50) | SÍ | 'asesor' | Rol a asignar |
| invitado\_por | UUID | SÍ | — | FK → auth.users(id) |
| usado | BOOLEAN | SÍ | FALSE | Si ya se redimió |
| expires\_at | TIMESTAMPTZ | NO | — | Expiración (24 h por defecto) |
| created\_at | TIMESTAMPTZ | SÍ | NOW() |  |

**Políticas RLS:** - SELECT: admin o quien invitó. - INSERT: solo admin o asesor.

## 4. Tipos enumerados (CHECK constraints)

| Tabla.columna | Valores permitidos |
| --- | --- |
| profiles.rol | admin, asesor, agricultor, analista |
| beneficiarios.tipo\_documento | CC, CE, TI, PAS, NIT |
| predios.tipo\_tenencia | Propia, Posesion, Arriendo, Otro |
| predios.vive\_en\_predio | Si, No, Cerca |
| caracterizacion\_predio.topografia | 0-25% Plana, 26-50% Inclinada, 51%> Pendiente |
| area\_productiva.estado\_cultivo | Tecnificado, En mal estado, NS/NR |

## 5. Funciones y triggers

### 5.1 handle\_new\_user()

Trigger en auth.users AFTER INSERT. Crea automáticamente la fila correspondiente en profiles con rol 'asesor' por defecto (o el rol especificado en raw\_user\_meta\_data).

CREATE OR REPLACE FUNCTION public.handle\_new\_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
 INSERT INTO public.profiles (id, email, nombre\_completo, rol)
 VALUES (
 NEW.id,
 NEW.email,
 COALESCE(NEW.raw\_user\_meta\_data ->> 'nombre\_completo', NEW.email),
 COALESCE(NEW.raw\_user\_meta\_data ->> 'rol', 'asesor')
 )
 ON CONFLICT (id) DO NOTHING;
 RETURN NEW;
END;
$$;

### 5.2 generar\_radicado\_oficial()

Función PL/pgSQL que calcula el siguiente radicado oficial (RAD-000001, RAD-000002, …). Se invoca desde el endpoint /api/caracterizaciones al crear una visita.

## 6. Storage Buckets (Supabase Storage)

| Bucket | Público | Contenido |
| --- | --- | --- |
| fotos-productores | NO | Fotos de rostro de beneficiarios |
| firmas | NO | Firmas digitales (PNG) |
| fotos-predios | NO | Fotos del predio (hasta 2 por caracterización) |
| documentos-identidad | NO | Fotos frontal/trasera del documento |

Acceso controlado por políticas RLS de Storage. Las URLs firmadas tienen validez 1 hora (configurable).

## 7. Matriz de relaciones (cardinalidad)

| Origen | Relación | Destino |
| --- | --- | --- |
| auth.users | 1:1 | profiles |
| auth.users (asesor) | 1:N | visitas |
| visitas | 1:N | beneficiarios |
| beneficiarios | 1:N | predios |
| beneficiarios | 1:1 | informacion\_financiera |
| predios | 1:1 | caracterizacion\_predio |
| predios | 1:N | abastecimiento\_agua |
| predios | 1:N | riesgos\_predio |
| predios | 1:N | area\_productiva |
| visitas + beneficiarios + predios | 1:1 | caracterizaciones |
| auth.users (invitado\_por) | 1:N | invitations |

## 9. Integridad referencial

* Todas las FK utilizan **ON DELETE CASCADE** salvo visitas.asesor\_id (SET NULL implícito, el asesor puede eliminarse sin perder las visitas).
* Al eliminar una caracterización (admin) se eliminan en cascada: visita, beneficiario, predio y todas las sub-tablas.
* beneficiarios.numero\_documento NO es UNIQUE porque un mismo beneficiario puede tener múltiples visitas/caracterizaciones en el tiempo.

## 10. Políticas de Row Level Security

Todas las tablas tienen RLS habilitado. Patrón general:

* **SELECT**: propio asesor (cadena asesor\_id = auth.uid()) o rol = 'admin' o rol = 'analista'.
* **INSERT**: solo con cadena que garantice asesor\_id = auth.uid().
* **UPDATE**: propio asesor, admin o (para caracterizaciones.estado) analista.
* **DELETE**: solo admin.

Ver los archivos scripts/003\_complete\_agrosantander\_schema.sql y supabase/migrations/20260302\_update\_policies.sql para el detalle completo de cada política.

## 11. Migraciones aplicadas

En el repositorio se conservan dos conjuntos de scripts SQL:

**scripts/** — esquema inicial (orden de ejecución):

1. 001\_create\_schema.sql — tablas base.
2. 002\_complete\_schema.sql — ampliación (incluye predios.poligono, tipo\_ubicacion).
3. 003\_complete\_agrosantander\_schema.sql — esquema completo + RLS + triggers + funciones.
4. 004\_insert\_test\_user\_asesor.sql — usuario de prueba (opcional).
5. 005\_public\_registros\_rls.sql — políticas para formulario público.

**supabase/migrations/** — cambios incrementales posteriores (orden por fecha):

1. 20260309\_fecha\_nacimiento.sql — añade beneficiarios.fecha\_nacimiento (DATE).
2. 20260309\_migracion\_completa.sql — consolidación idempotente: asegura caracterizaciones.estado con default INICIADO, elimina visitas.estado legacy, elimina beneficiarios.foto\_url, crea política UPDATE en caracterizaciones.
3. 20260422\_campos\_adicionales.sql — consolida los campos agregados durante el desarrollo: contacto secundario en beneficiarios, foto\_beneficiario\_url/foto\_doc\_frontal\_url/foto\_doc\_trasera\_url en caracterizaciones, numero\_documento en profiles, y rol analista en el CHECK constraint de profiles.rol. Idempotente.

**Para un despliegue fresco:** ejecutar **scripts 001–005** en orden y luego las tres migraciones en supabase/migrations/ por fecha. El resultado es el esquema completo vigente en producción.

## 12. Convenciones

* **UUID v4** como PK en todas las tablas (generación en BD).
* **TIMESTAMPTZ** (con zona horaria) para todos los timestamps.
* **DECIMAL** para valores monetarios y áreas (no FLOAT).
* **snake\_case** en nombres de tabla y columna.
* **CHECK constraints** para enumerados pequeños (alternativa a tipos enum PostgreSQL).
* Estados en mayúsculas constantes (INICIADO, REVISADO, etc.), labels UI en español humano.

*Para ampliar el esquema, crear una nueva migración SQL con nombre YYYYMMDD\_<descripcion>.sql en supabase/migrations/ y actualizar este documento.*
