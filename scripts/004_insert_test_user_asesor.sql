-- =============================================
-- CREAR USUARIO ASESOR DE PRUEBA
-- =============================================

-- PASO 1: Obtener el UUID del usuario de Supabase Auth
-- Ve a Supabase -> Authentication -> Users
-- Copia el UUID del usuario que creaste

-- Ejemplo UUID (REEMPLAZA ESTO CON EL TUYO):
-- 550e8400-e29b-41d4-a716-446655440000

-- PASO 2: Ejecuta este SQL en Supabase (SQL Editor)
-- Reemplaza el UUID con el que copiaste del usuario

INSERT INTO public.profiles (
  id,
  email,
  nombre_completo,
  rol,
  telefono,
  estado,
  foto_perfil_url,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',  -- REEMPLAZA CON TU UUID
  'asesor@agro360.com',                      -- REEMPLAZA CON EL EMAIL DEL USUARIO
  'Juan Pérez Asesor',                       -- REEMPLAZA CON EL NOMBRE
  'asesor',
  '+573001234567',
  'activo',
  NULL,
  NOW(),
  NOW()
);

-- Si ejecutas de nuevo y quieres actualizar:
-- UPDATE public.profiles
-- SET nombre_completo = 'Juan Pérez Asesor',
--     telefono = '+573001234567'
-- WHERE id = '550e8400-e29b-41d4-a716-446655440000';
