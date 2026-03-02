-- ============================================================
-- Migración: Nuevos campos requeridos (2026-02-26)
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Contacto secundario en beneficiarios
ALTER TABLE beneficiarios
  ADD COLUMN IF NOT EXISTS nombre_contacto_secundario TEXT,
  ADD COLUMN IF NOT EXISTS telefono_secundario TEXT,
  ADD COLUMN IF NOT EXISTS parentesco_contacto_secundario TEXT;

-- 2. Fotos del documento de identidad en caracterizaciones
ALTER TABLE caracterizaciones
  ADD COLUMN IF NOT EXISTS foto_doc_frontal_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_doc_trasera_url TEXT;

-- 3. Bucket para documentos de identidad (ejecutar en SQL si no se crea automáticamente)
-- NOTA: Los buckets se crean automáticamente en el primer sync.
-- Si necesitas crearlo manualmente en Supabase Storage:
--   Nombre: documentos-identidad
--   Público: true
--   Tipos permitidos: image/jpeg, image/png, image/webp
--   Tamaño máximo: 10 MB (10485760 bytes)
