-- Migración: agregar columna foto_beneficiario_url en caracterizaciones
-- El campo "Foto del Beneficiario" del formulario no tenía columna de destino en la BD.

ALTER TABLE caracterizaciones
  ADD COLUMN IF NOT EXISTS foto_beneficiario_url TEXT;
