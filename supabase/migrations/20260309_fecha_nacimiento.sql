-- Agrega columna fecha_nacimiento a la tabla beneficiarios
-- Ejecutar en Supabase Dashboard > SQL Editor

ALTER TABLE beneficiarios
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

COMMENT ON COLUMN beneficiarios.fecha_nacimiento IS 'Fecha de nacimiento del beneficiario (YYYY-MM-DD)';
