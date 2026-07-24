-- =====================================================================
-- Ubicación compartida de las fotos del paso "Fotos y Firma" — una sola
-- ubicación (lat/lng) para todo el formulario: EXIF de la primera foto que
-- la traiga, o GPS del dispositivo si ninguna trae metadatos.
-- Fecha: 2026-07-23
-- =====================================================================

ALTER TABLE public.caracterizaciones
  ADD COLUMN IF NOT EXISTS ubicacion_foto_lat  NUMERIC,
  ADD COLUMN IF NOT EXISTS ubicacion_foto_lng  NUMERIC;

COMMENT ON COLUMN caracterizaciones.ubicacion_foto_lat IS 'Latitud resuelta de EXIF/GPS al cargar las fotos del paso Fotos y Firma (una sola para todo el formulario).';
COMMENT ON COLUMN caracterizaciones.ubicacion_foto_lng IS 'Longitud resuelta de EXIF/GPS al cargar las fotos del paso Fotos y Firma (una sola para todo el formulario).';
