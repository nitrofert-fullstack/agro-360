-- ============================================================
-- Fix: agricultor no puede ver visitas (dashboard vacío).
-- Causa 1: visitas_select no tenía ruta para agricultor.
-- Causa 2: agregar EXISTS en beneficiarios dentro de visitas_select
--          creaba recursión mutua con beneficiarios_select.
-- Solución: función SECURITY DEFINER que corta el ciclo.
-- ============================================================

-- Función SECURITY DEFINER: lee beneficiarios SIN activar RLS.
-- Así visitas_select puede consultar beneficiarios sin recursión.
CREATE OR REPLACE FUNCTION public.agricultor_tiene_visita(vid UUID)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM beneficiarios b
    JOIN profiles p ON p.numero_documento = b.numero_documento
    WHERE b.id_visita = vid
      AND p.id = auth.uid()
      AND p.numero_documento IS NOT NULL
  )
$$;

GRANT EXECUTE ON FUNCTION public.agricultor_tiene_visita(UUID) TO authenticated;

-- Reemplazar política de visitas con la versión sin recursión
DROP POLICY IF EXISTS "visitas_select" ON visitas;

CREATE POLICY "visitas_select" ON visitas
  FOR SELECT TO authenticated
  USING (
    -- admin y analista ven todo
    public.mi_rol() IN ('admin', 'analista')
    -- asesor ve las suyas (asesor_id NULL = envíos públicos)
    OR auth.uid() = asesor_id
    -- agricultor: via SECURITY DEFINER (no activa RLS en beneficiarios → sin recursión)
    OR public.agricultor_tiene_visita(visitas.id)
  );
