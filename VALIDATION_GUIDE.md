# Validación del Sistema de Caracterización - Guía de Testing

## Resumen de Correcciones Realizadas

### 1. **DB Schema y Indexed-DB Storage** ✅
- Removidas campos inexistentes en BD: `grupoEtnico`, `discapacidad`, `tipoDiscapacidad`
- Estructura de `infoFinanciera` validada
- Tipos en indexed-db.ts alineados con esquema real de Supabase

### 2. **Formulario de Caracterización** ✅
- Nombres/apellidos ahora se dividen correctamente en `primerNombre`, `segundoNombre`, `primerApellido`, `segundoApellido`
- Filtrado de espacios en blanco: `.split(' ').filter(Boolean)` evita strings vacíos
- Mapeamiento completo de agua y riesgos con todos los campos booleanos individuales
- Se envían datos sin campos no existentes

### 3. **API Sync Route** ✅
- Creados INSERTs separados para `abastecimiento_agua` (tabla)
- Creados INSERTs separados para `riesgos_predio` (tabla)
- Los IDs de estas tablas se vinculan en la tabla principal `caracterizaciones`
- Rollback mejorado: elimina todas las tablas relacionadas en caso de error
- Manejo correcto de Foreign Keys

### 4. **Auto-Sync al Login** ✅
- Nuevo hook `use-auto-sync.ts` que se ejecuta cuando usuario inicia sesión
- Detecta registros pendientes en IndexedDB
- Sincroniza automáticamente y muestra toasts informativos
- Integrado en `SessionValidator` para ejecutarse globalmente

---

## Cómo Validar que Todo Funciona Correctamente

### Test 1: Guardar Formulario Localmente
**Objetivo**: Verificar que los datos se guardan correctamente en IndexedDB

**Pasos**:
1. Ir a `/formulario`
2. Llenar completamente un formulario (todos los pasos)
3. Hacer clic en "Enviar"
4. Verificar toast verde: "Caracterizacion guardada exitosamente"
5. Abrir DevTools → Application → IndexedDB → AgroSantander360DB → caracterizaciones
6. Verificar que existe el registro con estado: `PENDIENTE_SINCRONIZACION`

**Validaciones**:
- ✅ Beneficiario tiene `primerNombre`, `segundoNombre`, `primerApellido`, `segundoApellido`
- ✅ Agua tiene array de booleanos (`nacimientoManantial`, `rioQuebrada`, etc.)
- ✅ Riesgos tiene array de objetos `{ tipo, nivel }`
- ✅ No hay campos como `grupoEtnico` o `discapacidad`

---

### Test 2: Auto-Sync al Login
**Objetivo**: Verificar sincronización automática cuando usuario inicia sesión

**Pasos**:
1. Tener al menos 1 registro pendiente en IndexedDB (del Test 1)
2. Cerrar sesión (logout)
3. Hacer login nuevamente
4. Esperar 2-3 segundos
5. Verificar toast: "Sincronización completada - X registros sincronizados correctamente"

**Validaciones**:
- ✅ No requiere hacer clic en "Sincronizar"
- ✅ Funciona automáticamente al login
- ✅ Muestra mensaje de éxito/error

---

### Test 3: Sincronización Manual
**Objetivo**: Verificar que la sincronización manual funciona correctamente

**Pasos**:
1. Ir a `/consultar` (tener sesión iniciada)
2. Crear nuevo registro sin sincronizar
3. Ir a `/` → Botón "Sincronizar" (si existe)
4. O crear varios registros y sincronizar en grupo
5. Verificar que los registros aparecen en Supabase

**Validaciones en Supabase**:
- ✅ Tabla `beneficiarios` tiene datos correctos
- ✅ Tabla `predios` tiene FK a `beneficiarios`
- ✅ Tabla `abastecimiento_agua` creada con `predio_id`
- ✅ Tabla `riesgos_predio` creada con `predio_id`
- ✅ Tabla `caracterizaciones` tiene todos los IDs linkados

---

### Test 4: Validación de Datos en BD
**Objetivo**: Verificar estructura correcta en Supabase

**SQL Query** (ejecutar en Supabase SQL Editor):
```sql
-- Ver estructura de beneficiarios
SELECT * FROM beneficiarios LIMIT 1;

-- Verificar que no existen campos antiguos
SELECT column_name FROM information_schema.columns 
WHERE table_name='beneficiarios' 
AND column_name IN ('grupo_etnico', 'discapacidad', 'tipo_discapacidad');

-- Ver abastecimiento agua
SELECT * FROM abastecimiento_agua LIMIT 1;

-- Ver riesgos predio
SELECT * FROM riesgos_predio LIMIT 1;

-- Ver relaciones en caracterizaciones
SELECT 
  c.id,
  c.radicado_oficial,
  c.beneficiario_id,
  c.predio_id,
  c.abastecimiento_agua_id,
  c.riesgos_predio_id,
  c.area_productiva_id,
  c.informacion_financiera_id
FROM caracterizaciones c LIMIT 5;
```

**Validaciones**:
- ✅ `beneficiarios` tiene: `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`
- ✅ No hay columnas: `grupo_etnico`, `discapacidad`, `tipo_discapacidad`
- ✅ `abastecimiento_agua` existe con campos booleanos
- ✅ `riesgos_predio` existe con campo `riesgos` (JSONB)
- ✅ `caracterizaciones` tiene todos los IDs linkados correctamente

---

### Test 5: Flujo Completo Offline → Sync
**Objetivo**: Verificar que funciona en modo offline y luego sincroniza

**Pasos**:
1. Desconectar internet (DevTools → Network → Offline)
2. Llenar y guardar un formulario
3. Verificar que se guardó en IndexedDB
4. Reconectar internet
5. Hacer login
6. Verificar que se sincroniza automáticamente

**Validaciones**:
- ✅ Funciona sin conexión
- ✅ Se guarda en local
- ✅ Se sincroniza al volver online y loguearse

---

### Test 6: Datos Incorrectos / Campos Faltantes
**Objetivo**: Verificar que no haya conflictos con campos obsoletos

**Pasos**:
1. Abrir DevTools → Console
2. Ejecutar:
```javascript
// Verificar que no hay campos antiguo en nuevos registros
const caracterizacion = await db.caracterizaciones.toArray();
const last = caracterizacion[caracterizacion.length - 1];
console.log('Beneficiario:', last.beneficiario);
// No debe haber: grupoEtnico, discapacidad, tipoDiscapacidad
```

**Validaciones**:
- ✅ No existen campos obsoletos
- ✅ Estructura coincide con esquema SQL

---

## Correcciones de Bugs Específicos

### Bug: Nombres vacíos en BD
**Fue**: `primerNombre: ""` (string vacío)
**Ahora**: `primerNombre: ""` (si solo hay 1 palabra) o null si no existe
**Fix**: `.split(' ').filter(Boolean)[0] || ''`

### Bug: Agua y riesgos no creaban tablas
**Fue**: Se guardaban en `aguaRiesgos` como un objeto
**Ahora**: Se crean en `abastecimiento_agua` y `riesgos_predio` como tablas separadas
**Fix**: Nuevos INSERTs en API sync

### Bug: Sin sincronización automática
**Fue**: Usuario debía hacer clic manualmente en "Sincronizar"
**Ahora**: Se sincroniza automáticamente al login
**Fix**: Nuevo hook `use-auto-sync` en `SessionValidator`

---

## Checklist Final

Antes de considerar esto como "listo para producción":

- [ ] Test 1: Guardar localmente ✅
- [ ] Test 2: Auto-sync al login ✅
- [ ] Test 3: Sincronización manual ✅
- [ ] Test 4: Validación en BD ✅
- [ ] Test 5: Flujo offline ✅
- [ ] Test 6: Sin campos obsoletos ✅
- [ ] Revisar CloudWatch / Logs de errores
- [ ] Verificar RLS policies en Supabase (si están habilitadas)
- [ ] Testing con múltiples usuarios
- [ ] Testing con lotes grandes de registros (100+)

---

## Archivos Modificados

1. `/app/api/sync/route.ts` - Agregados INSERTs para agua y riesgos
2. `/components/characterization-form-complete.tsx` - Mejora en mapeamiento de datos
3. `/lib/db/indexed-db.ts` - Removidos campos obsoletos
4. `/hooks/use-auto-sync.ts` - NUEVO - Auto-sync al login
5. `/components/session-validator.tsx` - Integrado use-auto-sync

---

## Notas Importantes

1. **IndexedDB es local del navegador**: Cada dispositivo tiene su propia copia
2. **Sincronización es unidireccional**: Local → Servidor (al clic de botón o auto-sync)
3. **Si algo falla**: Ver console.log y mensaje de error en toast
4. **Backup automático**: Se crea backup cada vez que se guarda un registro
5. **Versionado de DB**: Si cambias schema, incrementa `db.version()` en indexed-db.ts
