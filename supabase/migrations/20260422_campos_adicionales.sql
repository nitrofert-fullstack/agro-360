-- Migración: columnas adicionales usadas por la aplicación
-- Fecha: 2026-04-22
-- Propósito: consolidar en código las columnas añadidas durante el desarrollo
--            que ya existen en la BD de producción pero no estaban reflejadas
--            en los scripts iniciales (scripts/001..005).
--
-- Esta migración es idempotente (ADD COLUMN IF NOT EXISTS). Segura de reejecutar.

-- =========================================
-- 1. Campos adicionales en beneficiarios
-- =========================================
ALTER TABLE public.beneficiarios
  ADD COLUMN IF NOT EXISTS nombre_contacto_secundario VARCHAR(200),
  ADD COLUMN IF NOT EXISTS telefono_secundario VARCHAR(20),
  ADD COLUMN IF NOT EXISTS parentesco_contacto_secundario VARCHAR(50);

-- =========================================
-- 2. Campos de fotos y autorizaciones adicionales en caracterizaciones
-- =========================================
ALTER TABLE public.caracterizaciones
  ADD COLUMN IF NOT EXISTS foto_beneficiario_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS foto_doc_frontal_url  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS foto_doc_trasera_url  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS autorizacion_aviso_privacidad BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS autorizacion_uso_imagen       BOOLEAN DEFAULT FALSE;

-- =========================================
-- 3. Documento en profiles (para agricultores)
-- =========================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS numero_documento VARCHAR(20);

-- =========================================
-- 4. Renombrar rol 'campesino' → 'agricultor' y actualizar CHECK
-- =========================================
-- Quitar el CHECK antiguo antes de actualizar valores (si existe)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;

-- Migrar registros existentes
UPDATE public.profiles
SET rol = 'agricultor'
WHERE rol = 'campesino';

-- También actualizar user_metadata en auth.users para registros existentes
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{rol}', '"agricultor"')
WHERE raw_user_meta_data ->> 'rol' = 'campesino';

-- Recrear el CHECK con los 4 roles finales
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_rol_check CHECK (rol IN ('admin','asesor','agricultor','analista'));
