# 11-diccionario-datos

> Convertido desde `11-diccionario-datos.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**11. Diccionario de Datos**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

## Tabla: visitas

|  |  |  |
| --- | --- | --- |
| **Columna** | **Tipo** | **Descripción** |
| id | UUID | PK, autogenerado |
| fecha\_visita | DATE | Fecha de la visita |
| nombre\_tecnico | VARCHAR | Nombre del asesor técnico |
| codigo\_formulario | VARCHAR | Código del formulario |
| version\_formulario | VARCHAR | Versión del formulario |
| fecha\_emision\_formulario | DATE | Fecha de emisión |
| radicado\_local | VARCHAR UNIQUE | Radicado local del sistema |
| radicado\_oficial | VARCHAR UNIQUE | Radicado oficial asignado |
| asesor\_id | UUID | FK → auth.users (nullable) |
| created\_at | TIMESTAMPTZ | Fecha de creación |
| updated\_at | TIMESTAMPTZ | Última actualización |

## Tabla: beneficiarios

|  |  |  |
| --- | --- | --- |
| **Columna** | **Tipo** | **Descripción** |
| id | UUID | PK |
| id\_visita | UUID | FK → visitas |
| nombres | VARCHAR | Nombres del beneficiario |
| apellidos | VARCHAR | Apellidos |
| tipo\_documento | VARCHAR | CC, CE, TI, PAS, NIT |
| numero\_documento | VARCHAR | Número de documento |
| edad | INT | Edad en años |
| telefono | VARCHAR | Teléfono principal |
| correo | VARCHAR | Correo electrónico |
| ocupacion\_principal | VARCHAR | Ocupación |
| genero | TEXT | Género |
| personas\_a\_cargo | INT | Número de dependientes |
| fecha\_nacimiento | DATE | Fecha de nacimiento |
| nombre\_contacto\_secundario | TEXT | Nombre contacto de emergencia |
| telefono\_secundario | TEXT | Teléfono de emergencia |
| parentesco\_contacto\_secundario | TEXT | Parentesco con el titular |

## Tabla: predios

|  |  |  |
| --- | --- | --- |
| **Columna** | **Tipo** | **Descripción** |
| id | UUID | PK |
| id\_beneficiario | UUID | FK → beneficiarios |
| nombre\_predio | VARCHAR | Nombre del predio |
| departamento | VARCHAR | Departamento |
| municipio | VARCHAR | Municipio |
| vereda | VARCHAR | Vereda |
| coordenada\_x | VARCHAR | Coordenada X (longitud) |
| coordenada\_y | VARCHAR | Coordenada Y (latitud) |
| latitud | NUMERIC | Latitud decimal |
| longitud | NUMERIC | Longitud decimal |
| altitud\_msnm | NUMERIC | Altitud en metros sobre el nivel del mar |
| area\_total\_hectareas | NUMERIC | Área total del predio en ha |
| area\_productiva\_hectareas | NUMERIC | Área productiva en ha |
| poligono | JSON | Polígono GeoJSON del perímetro del predio |

## Tabla: caracterizaciones

|  |  |  |
| --- | --- | --- |
| **Columna** | **Tipo** | **Descripción** |
| id | UUID | PK |
| id\_visita | UUID | FK → visitas |
| id\_beneficiario | UUID | FK → beneficiarios |
| id\_predio | UUID | FK → predios |
| estado | VARCHAR | INICIADO/REVISADO/EN\_ESTUDIO\_CREDITO/APROBADO/CANCELADO |
| observaciones | TEXT | Observaciones del asesor |
| foto\_1\_url | VARCHAR | URL foto del predio 1 (Storage) |
| foto\_2\_url | VARCHAR | URL foto del predio 2 (Storage) |
| firma\_productor\_url | VARCHAR | URL firma digital (Storage) |
| foto\_beneficiario\_url | TEXT | URL foto de rostro del beneficiario |
| foto\_doc\_frontal\_url | TEXT | URL foto documento frontal |
| foto\_doc\_trasera\_url | TEXT | URL foto documento trasera |
| autorizacion\_datos\_personales | BOOLEAN | Autorización tratamiento de datos |
| autorizacion\_aviso\_privacidad | BOOLEAN | Autorización aviso de privacidad |
| autorizacion\_consulta\_crediticia | BOOLEAN | Autorización centrales de riesgo |
| autorizacion\_uso\_imagen | BOOLEAN | Autorización uso de imagen |

## Tabla: profiles

|  |  |  |
| --- | --- | --- |
| **Columna** | **Tipo** | **Descripción** |
| id | UUID | PK = auth.users.id |
| email | VARCHAR | Correo del usuario |
| nombre\_completo | VARCHAR | Nombre completo |
| rol | VARCHAR | admin/asesor/analista/agricultor |
| telefono | VARCHAR | Teléfono |
| activo | BOOLEAN | Cuenta activa/suspendida |
| numero\_documento | VARCHAR | Número de documento de identidad |
