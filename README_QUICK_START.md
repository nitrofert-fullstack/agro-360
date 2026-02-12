## 🚀 INICIO RÁPIDO - AgroSantander360

### PROBLEMA: Página en blanco o no funciona

**Causa:** Supabase no está configurado

---

## ✅ PASO 1: AGREGAR VARIABLES DE SUPABASE

1. **En v0, abre el sidebar izquierdo**
2. **Haz clic en "Vars"**
3. **Agrega EXACTAMENTE estas 2 variables:**

```
NEXT_PUBLIC_SUPABASE_URL = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...
```

**¿Dónde encuentro estos valores?**
- Ve a [supabase.com](https://supabase.com)
- Login → Accede a tu proyecto
- Settings → API
- Copia **Project URL** y **Anon Key**

**IMPORTANTE:** Sin estas variables, la app NO FUNCIONARÁ.

---

## ✅ PASO 2: CREAR TABLAS EN SUPABASE

1. **En Supabase, ve a:**  
   Project → SQL Editor (lado izquierdo)

2. **Nuevo Query**

3. **Copia TODO el contenido de:**  
   `/scripts/001_create_schema.sql`

4. **Pégalo en el editor**

5. **Haz clic en "Run"**

✅ Si no hay error rojo = **Listo**

---

## ✅ PASO 3: VERIFICAR QUE FUNCIONA

### Test 1: Página Principal
- Ve a `/` (home)
- Deberías ver logo + "AgroSantander360"
- Si ves blanco: revisa F12 Console para errores

### Test 2: Registrar Sin Login (FUNCIONA OFFLINE)
- Haz clic en **"Iniciar Caracterización"**
- Llena campos (cualquier dato está bien)
- Haz clic en **"Enviar"**
- Deberías ver: **"RADICADO-LOCAL-{números}"**

✅ Si ves radicado = **IndexedDB funciona**

### Test 3: Consultar Sin Login
- Ve a `/consultar`
- Documento: `1234567890`
- Radicado: usa el del Test 2
- Deberías ver los datos que guardaste

✅ Si aparecen datos = **Consulta funciona**

---

## ✅ PASO 4: CREAR USUARIO DE PRUEBA

### Opción A: Via Registro (Recomendado)
1. Ve a `/registro`
2. Usa:
   - Email: `asesor@test.com`
   - Password: `AsesorTest123!`
3. Completa el flujo

### Opción B: Crear Manual en Supabase
1. Ve a **Authentication** → **Users**
2. **New User** → Email + Password
3. Marca "Email Confirmed"

---

## ✅ PASO 5: PROBAR SINCRONIZACIÓN

1. **Loguéate** con `asesor@test.com`
2. **Carga el formulario** en `/formulario`
3. Completa y envía
4. Deberías ver botón **"Sincronizar"** (arriba derecha)
5. Haz clic
6. Deberías ver: **"Sincronización exitosa"**

✅ Si sincroniza = **Backend funciona**

---

## 🔑 CREDENCIALES DE PRUEBA

### Usuario Asesor
```
Email: asesor@test.com
Contraseña: AsesorTest123!
Rol: asesor
```

### Usuario Admin (opcional)
```
Email: admin@test.com
Contraseña: AdminTest123!
Rol: admin
```

**Para crear Admin manualmente en Supabase:**
1. Crea usuario en Auth → Users
2. Copia el UUID del usuario
3. Ve a SQL Editor y ejecuta:

```sql
INSERT INTO public.profiles (id, email, role) 
VALUES ('UUID_AQUI', 'admin@test.com', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

---

## 🗂️ ESTRUCTURA DE CARPETAS

```
/vercel/share/v0-project/
├── app/
│   ├── formulario/          → Registro de formularios (sin login)
│   ├── consultar/           → Consultar por campesino (sin login)
│   ├── admin/               → Panel admin (requiere login)
│   ├── auth/
│   │   ├── login/           → Página de login
│   │   └── invitation/      → Aceptar invitación
│   └── api/
│       ├── sync/            → Endpoint de sincronización
│       └── health/          → Health check
├── components/
│   ├── characterization-form.tsx  → Formulario principal
│   ├── connection-status.tsx      → Indicador de conexión
│   ├── sync-button.tsx            → Botón de sincronizar
│   └── pwa-provider.tsx           → Configuración PWA
├── hooks/
│   ├── use-auth.ts                → Hook de autenticación
│   ├── use-online-status.ts       → Detectar online/offline
│   └── use-sync.ts                → Hook de sincronización
├── lib/
│   ├── db/indexed-db.ts           → Base de datos local (Dexie)
│   └── supabase/
│       ├── client.ts              → Cliente Supabase (browser)
│       ├── server.ts              → Cliente Supabase (servidor)
│       └── middleware.ts          → Middleware para sesiones
└── public/
    ├── manifest.json              → PWA manifest
    ├── sw.js                      → Service Worker
    └── icons/                     → Iconos de la app
```

---

## 🐛 TROUBLESHOOTING

### Problema: "Página en blanco"
**Solución:**
1. Abre F12 (DevTools)
2. Ve a Console
3. Busca errores sobre "SUPABASE_URL" o "ANON_KEY"
4. Verifica que las variables estén en `Vars`

### Problema: "Error de autenticación"
**Solución:**
1. Crea usuario nuevo en Supabase Auth
2. Marca "Email Confirmed"
3. Intenta login nuevamente

### Problema: "No se guardan los formularios"
**Solución:**
1. Abre DevTools → Storage → IndexedDB
2. Busca base de datos "agrosantander360"
3. Si no existe: limpia sitio y recarga
4. Verifica que IndexedDB tenga permisos en el navegador

### Problema: "Sync no funciona"
**Solución:**
1. ¿Estás loguead? Si no, la sincronización no aparece
2. ¿Estás online? Verifica el indicador de conexión
3. Revisa Console para errores de API

### Problema: "IndexedDB lleno"
**Solución:**
```javascript
// En Console del navegador:
await db.delete();
location.reload();
```

---

## 📱 MODO OFFLINE

### ¿Qué funciona SIN internet?

✅ Registrar formularios  
✅ Llenar campos  
✅ Guardar en IndexedDB  
✅ Ver radicado local  
✅ Consultar datos guardados localmente  
✅ Descargar formulario como JSON  

### ¿Qué NO funciona sin internet?

❌ Sincronizar al servidor  
❌ Ver formularios de otros asesores  
❌ Login inicial  

---

## 🔐 SEGURIDAD

- **Datos locales:** Guardados en IndexedDB (encriptado por navegador)
- **Datos en tránsito:** HTTPS + JWT tokens
- **Datos en servidor:** Row Level Security (RLS) de Supabase
- **Contraseñas:** Hasheadas con bcrypt en Supabase

---

## 📚 MÁS INFORMACIÓN

Lee `SETUP.md` para detalles técnicos completos.

---

**¿Aún no funciona?** Verifica:
1. ✅ NEXT_PUBLIC_SUPABASE_URL en Vars
2. ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY en Vars
3. ✅ SQL script ejecutado en Supabase
4. ✅ Sin errores en F12 Console

