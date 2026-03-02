-- ============================================================
-- Migración: numero_documento en profiles (2026-02-27)
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- Permite vincular un perfil de campesino con su registro en beneficiarios
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS numero_documento VARCHAR(20);
