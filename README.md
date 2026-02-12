# AgroSantander360 - Sistema de Caracterización Predial

Sistema integral de caracterización predial para Santander, Colombia, con soporte offline-first, sincronización con Supabase, monitoreo NDVI, y gestión de asesores.

## Configuración Inicial

### Variables de Entorno Requeridas

Esta aplicación requiere las siguientes variables de entorno configuradas en tu proyecto de Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
```

**Cómo obtenerlas:**
1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Abre Settings → API
3. Copia la URL del proyecto y la clave anon

**Dónde configurarlas en Vercel:**
1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Settings → Environment Variables
3. Agrega las tres variables
4. Redeploya la app (git push o redeploy manual)

### ¿Las variables no se leen después de configurar?

Si después de configurar las variables de entorno en Vercel la app sigue diciendo "Variables de entorno faltantes", es porque:

**Problema**: Las variables se cargan durante el BUILD de Next.js, no en tiempo de ejecución.

**Solución**:
1. Configura las variables en Vercel Settings → Environment Variables
2. **Redeploya la app** (git push a main o usa el botón "Deploy" en Vercel)
3. Espera a que el build termine
4. Una vez el deploy esté listo, recarga la página (F5)

**Si aún no funcionan:**
- Verifica que las variables estén configuradas SIN espacios en blanco al inicio/final
- Asegúrate de que copias la URL completa (incluyendo https://)
- Copia la clave anon (no la clave de servicio)

## Flujo de la Aplicación

### Para Campesinos/Productores (Sin Login)
1. Acceden a `/formulario` o presionan "Iniciar Caracterización" en el home
2. Llenan el formulario completo con datos del predio, producción, etc.
3. El sistema guarda TODO en IndexedDB (almacenamiento local del navegador)
4. Los datos se guardan incluso sin conexión a internet
5. El campesino puede salir y volver después sin perder datos

### Para Asesores (Con Login)
1. Inician sesión con sus credenciales
2. Van al `/dashboard` y ven:
   - Estadísticas de caracterizaciones (total, pendientes, sincronizados)
   - Actividad reciente (registros locales + sincronizados en servidor)
   - Botón para sincronizar formularios pendientes
3. Pueden:
   - Crear nuevos formularios (se guardan con su ID automáticamente)
   - Sincronizar formularios con Supabase
   - Consultar formularios ya sincronizados
   - Ver el mapa NDVI
   - Gestionar su perfil

### Sincronización
- **Solo disponible con login y conexión a internet**
- Al presionar "Sincronizar", envia todos los formularios pendientes a Supabase
- Los formularios de asesores logueados se guardan con `asesor_id`
- Los formularios de campesinos sin login se guardan con `asesor_id = null`

## Estructura de Datos

### IndexedDB (Almacenamiento Local)
- **caracterizaciones**: Formularios locales completos
- Cada registro tiene:
  - `radicadoLocal`: ID único local (AUTO-GENERADO)
  - `estado`: PENDIENTE_SINCRONIZACION | SINCRONIZADO | ERROR_SINCRONIZACION
  - `asesorId`: UUID del asesor (o undefined si es campesino)
  - Todos los datos del formulario

### Supabase (Servidor)
Cuando se sincroniza, se crea un registro con:
- **caracterizaciones**: Tabla principal
  - `radicado_local`: Tomado de IndexedDB
  - `radicado_oficial`: Asignado por el sistema
  - `asesor_id`: UUID del asesor que registró
  - `beneficiario_id`: FK a beneficiarios
  - `predio_id`: FK a predios
  - `visita_id`: FK a visitas

Las otras tablas (beneficiarios, predios, etc.) se crean automáticamente durante la sincronización.

## Funcionalidades Principales

### 1. Formulario Completo
- Datos personales del productor
- Información del predio
- Caracterización técnica del predio
- Área productiva y cultivos
- Información financiera
- Firmas digitales (campesino + asesor)
- Fotos del predio y del campesino
- Autorizaciones legales

### 2. Dashboard del Asesor
- Visualización de estadísticas
- Lista de registros locales y sincronizados
- Botón de sincronización con feedback
- Conexión de estado (online/offline)

### 3. Página de Consulta Pública
- Buscar caracterizaciones por radicado o documento
- Ver estado de la caracterización
- Disponible con o sin login

### 4. Autenticación
- Login con email/password
- Recovery de contraseña
- Gestión de sesiones
- Redirección automática según permisos

## Depuración

### Ver qué está pasando
Abre la consola del navegador (F12) y busca logs con el prefijo `[v0]`:
```
[v0] Loading server stats for user: abc123...
[v0] Error loading server stats: ...
```

### Problemas comunes

**"Variables de entorno faltantes" aparece en la app**
→ Configura las variables en Vercel y redeploya

**Los registros no aparecen en "Actividad reciente"**
→ El usuario puede no tener registros sincronizados todavía
→ Verifica que estén en la tabla `caracterizaciones` de Supabase con `asesor_id` correcto

**El formulario no se sincroniza**
→ Verifica que tengas conexión a internet
→ Revisa la consola del navegador para errores
→ Asegúrate de estar logueado (solo asesores pueden sincronizar)

## Deployment

1. Push a main branch
2. Vercel despliega automáticamente
3. **IMPORTANTE**: Si agregaste variables de entorno nuevas, asegúrate de que estén configuradas en Settings → Environment Variables
4. Espera a que el build termine

## Estructura del Proyecto

```
/app
  /api/sync         - API para sincronizar con Supabase
  /auth             - Páginas de autenticación
  /dashboard        - Dashboard del asesor
  /formulario       - Formulario principal
  /consultar        - Página pública de consulta
  
/components
  /characterization-form-complete.tsx - Formulario completo
  /admin-dashboard.tsx - Dashboard del asesor
  /sync-button.tsx - Botón de sincronización
  
/lib
  /supabase         - Clientes de Supabase
  /db/indexed-db.ts - Funciones de IndexedDB
  
/hooks
  /use-auth.ts      - Hook de autenticación
  /use-sync.ts      - Hook de sincronización
```

---

**Deployed on Vercel** | **Built with v0.app**
# agro-360
# agro-360
