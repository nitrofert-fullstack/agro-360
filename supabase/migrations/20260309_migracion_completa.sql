-- Migración completa — estado actual de la base de datos
-- Ejecutar en Supabase Dashboard > SQL Editor
--
-- Esta migración reemplaza los scripts anteriores (ya no son necesarios).
-- Es segura para ejecutar aunque ya se hayan aplicado cambios parciales.

-- 1. Asegurar que caracterizaciones.estado exista con valor por defecto INICIADO
ALTER TABLE public.caracterizaciones
  ADD COLUMN IF NOT EXISTS estado character varying DEFAULT 'INICIADO'::character varying;

-- 2. Asegurar que visitas.estado NO exista (ya es obsoleto)
--    (si ya fue eliminado, esta sentencia no hace nada)
ALTER TABLE public.visitas DROP COLUMN IF EXISTS estado;

-- 3. Rellenar estado NULL con INICIADO en registros existentes
UPDATE public.caracterizaciones
SET estado = 'INICIADO'
WHERE estado IS NULL;

-- 4. Eliminar columna no usada beneficiarios.foto_url
ALTER TABLE public.beneficiarios DROP COLUMN IF EXISTS foto_url;

-- 5. Política RLS UPDATE para caracterizaciones (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'caracterizaciones'
      AND policyname = 'update_estado_caracterizaciones'
  ) THEN
    CREATE POLICY update_estado_caracterizaciones ON public.caracterizaciones
      FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
END
$$;
