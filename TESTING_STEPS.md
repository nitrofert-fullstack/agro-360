# Pasos para Validar que el Sistema Funciona Correctamente

## Pre-requisitos

✅ Supabase integrado  
✅ SQL ejecutado en Supabase  
✅ Todas las correcciones aplicadas  
✅ Aplicación corriendo en `localhost:3000`

---

## PASO 1: Verificar que No Hay Errores de Login (5 min)

### 1.1 Ir al Dashboard
- Abre `http://localhost:3000/dashboard`
- **Esperado**: Deberías estar logueado y ver el dashboard SIN errores en la consola
- **Verificar en browser console (F12)**:
  - NO debe haber errores de "profiles" table
  - NO debe haber "infinite recursion"

### 1.2 Revisar la Consola
- Abre las DevTools (F12) → Console
- Busca por "[Auth]"
- **Esperado**: NO debe haber ningún error

---

## PASO 2: Guardar un Formulario Localmente (10 min)

### 2.1 Ir al Formulario
- Clic en "Nuevo Formulario" o ve a `http://localhost:3000/formulario`

### 2.2 Rellenar Paso 1 - Datos de la Visita
```
- Fecha de Visita: Hoy (ej: 2026-02-12)
- Nombre del Técnico: Juan Pérez
- Código Formulario: TEST-001
```
- Clic en "Siguiente"

### 2.3 Rellenar Paso 2 - Datos del Beneficiario
```
Obligatorios (*):
- Nombres: Carlos
- Apellidos: Rodríguez
- Tipo Documento: CC
- Número Documento: 1234567890
- Edad: 45

Opcionales:
- Email: carlos@example.com
- Teléfono: 3001234567
- Ocupación: Agricultor
```
- Clic en "Siguiente"

### 2.4 Rellenar Paso 3 - Datos del Predio
```
- Nombre Predio: Finca Santa Rosa
- Tipo Tenencia: Propia
- Área Total: 5
- Ubicación Municipio: (tu municipio)
- Ubicación Vereda: (tu vereda)
```
- Clic en "Siguiente"

### 2.5 Rellenar Paso 4 - Caracterización
```
- Topografía: Plana
- Tipo Suelo: Franco
```
- Clic en "Siguiente"

### 2.6 Rellenar Paso 5 - Agua y Riesgos
```
- Seleccionar al menos una fuente de agua
- Seleccionar al menos un riesgo
```
- Clic en "Siguiente"

### 2.7 Rellenar Paso 6 - Área Productiva
```
- Cultivo Principal: Maíz
- Área Cultivo: 2
```
- Clic en "Siguiente"

### 2.8 Rellenar Paso 7 - Info Financiera
```
- Ingresos Mensuales: 2000000
```
- Clic en "Siguiente"

### 2.9 Rellenar Paso 8 - Autorización
```
- Checkbox: Autorizo tratamiento de datos
- Fecha: Hoy
```
- Clic en "Guardar"

### 2.10 Verificar Guardado Local
- **Esperado**: Deberías ver mensaje de éxito
- Abre la consola (F12) → Application → IndexedDB
- Busca "AgroSantander360DB" → "caracterizaciones"
- **Deberías ver** 1 registro con `estado: "PENDIENTE_SINCRONIZACION"`

✅ **Si llegaste aquí: El guardado local funciona**

---

## PASO 3: Sincronizar el Formulario (10 min)

### 3.1 Ir al Dashboard
- Ve a `http://localhost:3000/dashboard`
- Deberías ver "1 Pendientes" en las tarjetas de estadísticas

### 3.2 Hacer Clic en Sincronizar
- Botón "Sincronizar" en el header o dashboard
- **Esperado**: Ver loading spinner, luego mensaje de éxito

### 3.3 Verificar Sincronización
- Espera 2-3 segundos
- **Esperado**:
  - "1 Pendientes" → "0 Pendientes"
  - "0 Sincronizados" → "1 Sincronizados"
  - Toast mensaje: "1 formulario sincronizado correctamente"

### 3.4 Verificar en Supabase
- Ve a `supabase.com` → Tu proyecto
- SQL Editor → New Query
- Ejecuta:
```sql
SELECT 
  id, 
  radicado_local, 
  radicado_oficial, 
  estado,
  beneficiario_id,
  predio_id
FROM caracterizaciones
ORDER BY created_at DESC
LIMIT 1
```
- **Deberías ver** 1 registro con `estado: 'sincronizado'`

✅ **Si llegaste aquí: La sincronización funciona**

---

## PASO 4: Probar Manejo de Errores (10 min)

### 4.1 Crear Formulario con Datos Inválidos
- Ve a formulario nuevamente
- Relena SOLO:
  - Paso 1: Datos de visita
  - Paso 2: Datos beneficiario (igual documento `1234567890`)
- Intenta guardar

### 4.2 Sincronizar (Debería Fallar)
- Ve al dashboard
- Clic en "Sincronizar"
- **Esperado**: Error porque el documento ya existe

### 4.3 Ver Error en Dashboard
- **Deberías ver** un componente rojo "Errores de Sincronización"
- Muestra: "1 formulario con problemas"
- Puedes ver detalles del error

### 4.4 Reintentar
- Clic en "Reintentar" en el error display
- Luego sincroniza nuevamente
- **Deberías ver** el error nuevamente (porque el problema persiste)

✅ **Si llegaste aquí: El manejo de errores funciona**

---

## PASO 5: Consultar Datos Sincronizados (5 min)

### 5.1 Ir a Consultar
- Ve a `http://localhost:3000/consultar`
- O clic en "Consultar" en dashboard

### 5.2 Buscar por Radicado
- Ingresa el radicado que se creó (aparece en la tabla)
- Clic en "Buscar"
- **Esperado**: Ver todos los datos del formulario

### 5.3 Verificar Datos
- Comprueba que:
  - Nombres está dividido en primerNombre + segundoNombre
  - Apellidos está dividido en primerApellido + segundoApellido
  - Todos los campos están correctos

✅ **Si llegaste aquí: La consulta funciona**

---

## PASO 6: Prueba Offline → Online (15 min)

### 6.1 Desconectar Internet
- Abre DevTools → Network → Offline

### 6.2 Crear Nuevo Formulario
- Ve a `/formulario`
- Completa y guarda un formulario
- **Esperado**: Se guarda en IndexedDB (sin internet)
- Ver mensaje de éxito

### 6.3 Intentar Sincronizar
- Clic en sincronizar
- **Esperado**: Mensaje "Sin conexión a internet"

### 6.4 Reconectar Internet
- DevTools → Network → Online

### 6.5 Sincronizar
- Clic en sincronizar nuevamente
- **Esperado**: Se sincroniza correctamente

✅ **Si llegaste aquí: El offline-first funciona**

---

## RESUMEN - ¿Qué Debería Funcionar?

| Característica | Status |
|---|---|
| ✅ Guardar formularios localmente | Debe funcionar |
| ✅ Sincronizar a Supabase | Debe funcionar |
| ✅ Ver errores de sincronización | Debe funcionar |
| ✅ Reintentar sincronización | Debe funcionar |
| ✅ Consultar datos por radicado | Debe funcionar |
| ✅ Nombres/apellidos divididos correctamente | Debe funcionar |
| ✅ Sin errores en dashboard | Debe funcionar |
| ✅ Offline-first working | Debe funcionar |

---

## Troubleshooting

### Problema: Error "profiles" table en login
- **Solución**: Ya fue corregido en `/hooks/use-auth.ts`
- Si persiste: Limpia localStorage/IndexedDB y recarga

### Problema: Error "400 Bad Request" en dashboard
- **Solución**: Ya fue corregido en `/app/dashboard/page.tsx`
- Si persiste: Recarga la página

### Problema: Sincronización falla
- Ver el error display en dashboard
- Verifica que:
  1. Estés autenticado
  2. Tengas internet
  3. Todos los campos obligatorios estén completos
  4. El documento del beneficiario sea único

### Problema: No ves el error display
- Asegúrate de tener registros con `estado: 'ERROR_SINCRONIZACION'` en IndexedDB
- Si no hay errores, el componente no aparece (comportamiento correcto)

---

## Notas Finales

- Toda la data se guarda primero en **IndexedDB** (local)
- Luego se sincroniza a **Supabase** cuando hay internet y autenticación
- Si falla, se marca como ERROR y aparece en el error display
- El usuario puede reintentar manualmente
- No hay pérdida de datos

**¡El sistema ahora es robusto y offline-first!** 🚀
