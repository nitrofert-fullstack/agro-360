# SETUP - AgroSantander360 (Offline-First PWA)

## 1. CONFIGURACIÓN DE SUPABASE

### 1.1 Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto (elige región más cercana)
3. Copia estas variables en `Vars` (sidebar izquierdo de v0):
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Anon Key)

### 1.2 Crear Tablas en Supabase

Copia y ejecuta EXACTAMENTE este SQL en el SQL Editor de Supabase (sin modificar):

```sql
-- 1. Tabla de perfiles de usuarios
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'asesor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de caracterizaciones
CREATE TABLE IF NOT EXISTS public.caracterizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  radicado_local TEXT NOT NULL UNIQUE,
  radicado_oficial TEXT UNIQUE,
  documento_productor TEXT NOT NULL,
  nombre_productor TEXT NOT NULL,
  asesor_id UUID REFERENCES auth.users(id),
  asesor_email TEXT,
  estado TEXT DEFAULT 'PENDIENTE_SINCRONIZACION',
  datos_tecnico JSONB,
  informacion_familiar JSONB,
  datos_predio JSONB,
  descripcion_fisica JSONB,
  area_productiva JSONB,
  info_financiera JSONB,
  autorizacion JSONB,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  fecha_sincronizacion TIMESTAMPTZ,
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
  intentos_sincronizacion INT DEFAULT 0,
  ultimo_error_sincronizacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de invitaciones
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  tipo TEXT DEFAULT 'asesor',
  usado BOOLEAN DEFAULT FALSE,
  fecha_expiracion TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caracterizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Políticas para caracterizaciones
CREATE POLICY "Users can view their own caracterizaciones" ON public.caracterizaciones
  FOR SELECT USING (auth.uid() = asesor_id OR auth.uid()::text = 'admin');

CREATE POLICY "Users can insert their own caracterizaciones" ON public.caracterizaciones
  FOR INSERT WITH CHECK (auth.uid() = asesor_id);

CREATE POLICY "Users can update their own caracterizaciones" ON public.caracterizaciones
  FOR UPDATE USING (auth.uid() = asesor_id);
```

### 1.3 Ejecutar Trigger para Auto-crear Perfil

Copia en el SQL Editor:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'asesor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## 2. CREDENCIALES DE PRUEBA

### Para Acceso de Asesor

**Email:** asesor@test.com  
**Contraseña:** AsesorTest123!

**Cómo crear:**
1. Ve a la página de [Registro](/registro) en la app
2. Usa las credenciales arriba
3. Completa el flujo de invitación

### Para Admin (opcional)

Si necesitas acceso admin, ve a Supabase > Authentication > Users, crea un usuario manualmente y luego en SQL:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@test.com';
```

## 3. FLUJO DE ACCESO

```
┌─────────────────────────────────────────────┐
│   PÁGINA PRINCIPAL (/)                      │
└─────────────────────────────────────────────┘
           ↓
    ┌──────────────────────┐
    │ ¿Qué deseas hacer?   │
    ├──────────────────────┤
    │ 1. Registrar Form    │ → /formulario (sin login)
    │ 2. Ver Admin Panel   │ → /admin (requiere login)
    │ 3. Consultar Predio  │ → /consultar (sin login)
    │ 4. Sincronizar       │ → /api/sync (requiere login + online)
    └──────────────────────┘
```

## 4. FUNCIONALIDADES OFFLINE

### ✅ Ya implementado:

- **IndexedDB (Dexie)** - Almacenamiento local persistente
- **Service Worker** - Cache de assets
- **PWA Manifest** - Installable como app nativa
- **useOnlineStatus()** - Detección de conexión
- **useSync()** - Sistema de sincronización manual

### 🔄 Flujo Offline-First:

1. **Sin conexión:**
   - Completas el formulario
   - Se guarda en IndexedDB + localStorage
   - Obtienes número de radicado LOCAL: `RADICADO-LOCAL-{timestamp}`
   - Puede descargarse como JSON

2. **Con conexión + Loguead:**
   - Botón "Sincronizar" se activa
   - Envía formularios locales a `/api/sync`
   - Recibe radicado OFICIAL: `RAD-00001`
   - Estado cambia a `SINCRONIZADO`

3. **Campesino consulta:**
   - Usa `/consultar` con documento + radicado
   - Si es LOCAL: muestra datos del navegador
   - Si es OFICIAL: consulta backend

## 5. VARIABLES DE ENTORNO NECESARIAS

En `Vars` (sidebar) de v0, NECESITAS:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

Si NO están, la app no funcionará.

## 6. PRUEBAS RÁPIDAS

### Test 1: Registrar formulario sin conexión
1. Ve a `/formulario`
2. Completa todos los campos
3. Presiona "Enviar"
4. Deberías ver un número de radicado LOCAL

### Test 2: Consultar sin login
1. Ve a `/consultar`
2. Usa documento `1234567890`
3. Usa el radicado del Test 1
4. Deberías ver los datos registrados

### Test 3: Sincronizar con login
1. Loguéate en `/login` (asesor@test.com)
2. Completa otro formulario
3. Presiona botón "Sincronizar"
4. Si aparece radicado OFICIAL = ✅ Funciona

## 7. TROUBLESHOOTING

### "Página en blanco"
- Abre F12 (Developer Tools)
- Revisa Console para errores
- Verifica que SUPABASE_URL y ANON_KEY estén en Vars

### "No puedo registrar"
- Verifica que Supabase esté activo
- Revisa que las tablas existan (step 1.2)

### "No me deja sincronizar"
- Necesitas estar LOGUEAD
- Necesitas estar ONLINE
- Ve a Admin y crea la tabla: `invitations`

### "IndexedDB no guarda"
- Verifica en DevTools > Storage > IndexedDB
- Limpia el sitio y recarga

## 8. PRÓXIMAS TAREAS (Manual)

1. **Crear usuarios de prueba en Supabase:**
   - Auth > Users > Add User
   
2. **Configurar email (opcional):**
   - Authentication > Providers > Email
   
3. **Agregar imágenes iconos PWA:**
   - Descarga iconos en `/public/`
   
4. **Pruebas de sincronización:**
   - Descarga formulario local (JSON)
   - Prueba consulta con radicado oficial

---

**¿Preguntas?** Lee los archivos en `/lib/db/` y `/hooks/` para entender la arquitectura.
