# Correcciones Aplicadas al Sistema - Agro360

## Resumen de Problemas y Soluciones

### 1. ✅ Error: "infinite recursion detected in policy for relation profiles"

**Problema**: La tabla `profiles` no existe en Supabase y estaba causando un error de recursión infinita en las políticas RLS.

**Solución**:
- Eliminada la consulta a la tabla `profiles` inexistente
- El perfil ahora se obtiene directamente de `Supabase.auth.getUser()`
- Archivo modificado: `/hooks/use-auth.ts`

```typescript
const fetchProfile = useCallback(async (userId: string) => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser?.email) {
      setProfile({
        id: userId,
        email: authUser.email,
        nombre_completo: authUser.user_metadata?.nombre_completo || 'Asesor',
        rol: 'asesor',
        activo: true
      })
    }
  } catch (err) {
    console.error('[Auth] Error fetching profile:', err)
  }
}, [supabase])
```

---

### 2. ✅ Error: "400 Bad Request" en query de caracterizaciones

**Problema**: El query a `caracterizaciones` incluía un join a `beneficiarios` con campos `nombres` y `apellidos` que no existen (la tabla usa `primer_nombre`, `segundo_nombre`, etc.).

**Solución**:
- Removido el join innecesario a `beneficiarios`
- Simplificado el query a solo campos de `caracterizaciones`
- Archivo modificado: `/app/dashboard/page.tsx`

```typescript
const { data: serverCaracterizaciones, error } = await supabase
  .from('caracterizaciones')
  .select(`
    id,
    radicado_local,
    estado,
    created_at,
    asesor_id,
    beneficiario_id
  `)
  .eq('asesor_id', user.id)
  .order('created_at', { ascending: false })
  .limit(5)
```

---

### 3. ✅ Falta de Manejo de Errores de Sincronización

**Problema**: Cuando la sincronización fallaba, el usuario solo veía un mensaje genérico sin detalles de qué estaba mal.

**Solución**:
- Creado nuevo componente `SyncErrorDisplay` que muestra todos los errores de sincronización
- Agregada función `getCaracterizacionesConError()` en indexed-db
- Mejorada función `markAsError()` para permitir reintentos
- Integrado el componente en el dashboard
- Archivos creados/modificados:
  - `/components/sync-error-display.tsx` (NUEVO)
  - `/lib/db/indexed-db.ts`
  - `/app/dashboard/page.tsx`

**Características del error display**:
- Lista de todos los errores con detalles
- Botón para reintentar sincronización individual
- Tab con detalles completos del error
- Sugerencias de solución

---

### 4. ✅ Mejoras en IndexedDB para Reintentos

**Cambios en `/lib/db/indexed-db.ts`**:

```typescript
// Nuevas funciones
export async function getCaracterizacionesConError(): Promise<CaracterizacionLocal[]>
// Obtiene todos los registros con estado ERROR_SINCRONIZACION

// Función mejorada
export async function markAsError(id: number, error: string | null): Promise<void>
// Si error es null → marca como PENDIENTE para reintentar
// Si error es string → marca como ERROR con mensaje
```

---

## Cómo Funciona Ahora el Sistema

### Flujo de Guardado y Sincronización

```
1. Usuario rellena formulario
   ↓
2. Clic en "Guardar"
   ├─ Valida campos (muestra errores si hay)
   ├─ Guarda en IndexedDB (almacenamiento local)
   └─ Muestra "Guardado localmente"
   ↓
3. Usuario intenta sincronizar (manual o automático)
   ├─ Si hay internet y está autenticado → sincroniza
   ├─ Si éxito → marca como SINCRONIZADO
   └─ Si error → marca como ERROR + guarda mensaje
   ↓
4. En Dashboard → SyncErrorDisplay muestra errores
   ├─ Usuario puede ver detalles del error
   ├─ Puede reintentar individual o grupal
   └─ Si funciona → se sincroniza correctamente
```

---

## Estados de los Registros

- **PENDIENTE_SINCRONIZACION**: Guardado en local, listo para sincronizar
- **SINCRONIZADO**: Sincronizado exitosamente con Supabase
- **ERROR_SINCRONIZACION**: Falló la sincronización, muestra error

---

## Para Verificar que Todo Funciona

### Test 1: Guardar Formulario Localmente
1. Ve a `/formulario`
2. Completa algunos campos básicos
3. Clic en "Guardar"
4. Debe guardar en IndexedDB (sin necesidad de internet)

### Test 2: Ver Errores si Hay
1. Ve a `/dashboard`
2. Si hay registros con error, verás "SyncErrorDisplay" al top
3. Puedes ver detalles de cada error
4. Clic en "Reintentar" para intentar nuevamente

### Test 3: Sincronización Manual
1. Clic en botón "Sincronizar" en header o dashboard
2. Si todo está bien → se sincroniza
3. Si hay error → aparece en SyncErrorDisplay

---

## Errores Comunes Que Podrías Ver

### "Error creando beneficiario: violacion de restriccion UNIQUE"
- **Causa**: El documento del beneficiario ya existe
- **Solución**: Usa otro documento o modifica el existente

### "Error creando caracterizacion: llave foranea"
- **Causa**: Uno de los IDs relacionados no existe
- **Solución**: Asegúrate de que beneficiario y predio se crearon correctamente

### "Could not find table X"
- **Causa**: Falta una tabla en Supabase
- **Solución**: Ejecuta el SQL de setup en Supabase

---

## Próximos Pasos para Producción

1. ✅ Tabla `profiles` → REMOVIDA (ya no se usa)
2. ✅ Queries corregidas
3. ✅ Error display agregado
4. ✅ Reintentos implementados
5. 🔄 TODO: Agregar validación más estricta en backend
6. 🔄 TODO: Logging detallado en API sync para debugging
7. 🔄 TODO: Tests automatizados para flujo completo

---

## Archivos Modificados en Esta Ronda

1. `/hooks/use-auth.ts` - Removida consulta a profiles
2. `/app/dashboard/page.tsx` - Query corregido, error display agregado
3. `/lib/db/indexed-db.ts` - Nuevas funciones, markAsError mejorada
4. `/components/sync-error-display.tsx` - NUEVO componente

**Total: 4 cambios críticos**
