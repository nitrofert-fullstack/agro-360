-- =====================================================================
-- Nuevos campos del formulario de caracterización — Beneficiario, Predio,
-- Caracterización y nuevo paso "Concepto" (solo asesor/admin).
-- Fecha: 2026-07-22
-- Seguro de ejecutar aunque ya se hayan aplicado cambios parciales (idempotente).
-- =====================================================================

-- -------------------------
-- 1. beneficiarios
-- -------------------------
-- `vive_en_predio` se traslada conceptualmente de `predios` a `beneficiarios`
-- (el productor, no el predio, es quien "vive" o no en el predio). La columna
-- vieja en `predios` NO se borra en esta migración para no perder datos
-- históricos; bórrala manualmente en una migración posterior una vez que
-- los datos existentes se hayan copiado/migrado si aplica.
ALTER TABLE public.beneficiarios
  ADD COLUMN IF NOT EXISTS vive_en_predio              VARCHAR(20),
  ADD COLUMN IF NOT EXISTS trabaja_predio               BOOLEAN,
  ADD COLUMN IF NOT EXISTS familia_participa_labores    BOOLEAN,
  ADD COLUMN IF NOT EXISTS interes_asociarse            BOOLEAN,
  ADD COLUMN IF NOT EXISTS interes_asociarse_vecinos    BOOLEAN,
  ADD COLUMN IF NOT EXISTS experiencia_agropecuaria     TEXT;

COMMENT ON COLUMN beneficiarios.vive_en_predio IS 'Reemplaza a predios.vive_en_predio (columna legado, ver comentario en esa tabla). Valores: Si/No/Cerca.';
COMMENT ON COLUMN beneficiarios.trabaja_predio IS '¿Trabaja directamente en el predio?';
COMMENT ON COLUMN beneficiarios.familia_participa_labores IS '¿Los miembros del núcleo familiar participan en las labores del predio?';
COMMENT ON COLUMN beneficiarios.interes_asociarse IS 'Si no está asociado, ¿tiene interés en asociarse?';
COMMENT ON COLUMN beneficiarios.interes_asociarse_vecinos IS '¿Le gustaría asociarse con sus vecinos?';
COMMENT ON COLUMN beneficiarios.experiencia_agropecuaria IS 'Texto completo de una de las 5 opciones fijas del formulario.';

-- -------------------------
-- 2. predios
-- -------------------------
-- NOTA: predios.vive_en_predio queda deprecada (ver arriba). Se conserva sin
-- tocar; el formulario ya no la lee ni la escribe desde este cambio en adelante.
ALTER TABLE public.predios
  ADD COLUMN IF NOT EXISTS via_acceso              TEXT,
  ADD COLUMN IF NOT EXISTS cultivo_ya_en_predio    TEXT;

COMMENT ON COLUMN predios.via_acceso IS 'Texto completo de una de las 5 opciones fijas del formulario (tipo de vía de acceso).';
COMMENT ON COLUMN predios.cultivo_ya_en_predio IS '¿El cultivo/actividad de interés ya se realiza en el predio? — una de 3 opciones fijas.';
-- COMENTADO A PROPÓSITO — ejecutar manualmente solo tras confirmar que los datos
-- relevantes ya se migraron a beneficiarios.vive_en_predio:
-- ALTER TABLE public.predios DROP COLUMN IF EXISTS vive_en_predio;

-- -------------------------
-- 3. caracterizacion_predio
-- -------------------------
ALTER TABLE public.caracterizacion_predio
  ADD COLUMN IF NOT EXISTS distancia_cabecera_tiempo   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS distancia_capital_tiempo    VARCHAR(50);

COMMENT ON COLUMN caracterizacion_predio.distancia_cabecera_tiempo IS 'Tiempo estimado a la cabecera municipal — una de 5 opciones fijas.';
COMMENT ON COLUMN caracterizacion_predio.distancia_capital_tiempo IS 'Tiempo estimado a la capital del departamento — una de 5 opciones fijas.';

-- -------------------------
-- 4. concepto_visita (tabla nueva)
-- -------------------------
-- Concepto técnico del asesor sobre el proceso — paso 9 del formulario,
-- visible solo para asesores/admins. Se relaciona 1:1 con `caracterizaciones`
-- (el registro central), igual que `informacion_financiera` se relaciona con
-- `beneficiarios`: FK directa a la fila padre relevante.
CREATE TABLE IF NOT EXISTS public.concepto_visita (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_caracterizacion    UUID NOT NULL REFERENCES public.caracterizaciones(id) ON DELETE CASCADE,
  continuar_proceso     TEXT,
  vocacion_agricola     TEXT,
  cultivo_zona_cercana  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.concepto_visita IS 'Concepto técnico del asesor sobre el proceso (paso "Concepto" del formulario, solo asesor/admin).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_concepto_visita_caracterizacion
  ON public.concepto_visita (id_caracterizacion);

ALTER TABLE public.concepto_visita ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "concepto_visita_select" ON public.concepto_visita;
DROP POLICY IF EXISTS "concepto_visita_insert" ON public.concepto_visita;
DROP POLICY IF EXISTS "concepto_visita_update" ON public.concepto_visita;
DROP POLICY IF EXISTS "concepto_visita_delete" ON public.concepto_visita;

CREATE POLICY "concepto_visita_select" ON public.concepto_visita
  FOR SELECT USING (
    public.mi_rol() IN ('admin', 'analista')
    OR EXISTS (
      SELECT 1 FROM caracterizaciones c
      JOIN visitas v ON v.id = c.id_visita
      WHERE c.id = concepto_visita.id_caracterizacion
        AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "concepto_visita_insert" ON public.concepto_visita
  FOR INSERT WITH CHECK (
    public.mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM caracterizaciones c
      JOIN visitas v ON v.id = c.id_visita
      WHERE c.id = id_caracterizacion
        AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "concepto_visita_update" ON public.concepto_visita
  FOR UPDATE USING (
    public.mi_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM caracterizaciones c
      JOIN visitas v ON v.id = c.id_visita
      WHERE c.id = concepto_visita.id_caracterizacion
        AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "concepto_visita_delete" ON public.concepto_visita
  FOR DELETE USING (public.mi_rol() = 'admin');
