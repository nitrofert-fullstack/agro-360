-- ============================================================
-- Migración: Políticas UPDATE faltantes (2026-03-02)
-- Ejecutar en Supabase Dashboard > SQL Editor
-- NOTA: CREATE POLICY IF NOT EXISTS no existe en PG15 → usar DROP + CREATE
-- ============================================================

-- caracterizacion_predio
DROP POLICY IF EXISTS "caracterizacion_predio_update" ON caracterizacion_predio;
CREATE POLICY "caracterizacion_predio_update" ON caracterizacion_predio
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM predios p
      JOIN beneficiarios b ON b.id = p.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE p.id = caracterizacion_predio.id_predio
        AND (
          v.asesor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'analista'))
        )
    )
  );

-- abastecimiento_agua
DROP POLICY IF EXISTS "abastecimiento_agua_update" ON abastecimiento_agua;
CREATE POLICY "abastecimiento_agua_update" ON abastecimiento_agua
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM predios p
      JOIN beneficiarios b ON b.id = p.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE p.id = abastecimiento_agua.id_predio
        AND (
          v.asesor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'analista'))
        )
    )
  );

-- riesgos_predio
DROP POLICY IF EXISTS "riesgos_predio_update" ON riesgos_predio;
CREATE POLICY "riesgos_predio_update" ON riesgos_predio
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM predios p
      JOIN beneficiarios b ON b.id = p.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE p.id = riesgos_predio.id_predio
        AND (
          v.asesor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'analista'))
        )
    )
  );

-- area_productiva
DROP POLICY IF EXISTS "area_productiva_update" ON area_productiva;
CREATE POLICY "area_productiva_update" ON area_productiva
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM predios p
      JOIN beneficiarios b ON b.id = p.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE p.id = area_productiva.id_predio
        AND (
          v.asesor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'analista'))
        )
    )
  );

-- informacion_financiera
DROP POLICY IF EXISTS "informacion_financiera_update" ON informacion_financiera;
CREATE POLICY "informacion_financiera_update" ON informacion_financiera
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM beneficiarios b
      JOIN visitas v ON v.id = b.id_visita
      WHERE b.id = informacion_financiera.id_beneficiario
        AND (
          v.asesor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'analista'))
        )
    )
  );

-- caracterizaciones
DROP POLICY IF EXISTS "caracterizaciones_update" ON caracterizaciones;
CREATE POLICY "caracterizaciones_update" ON caracterizaciones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM visitas
      WHERE visitas.id = caracterizaciones.id_visita
        AND (
          visitas.asesor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'analista'))
        )
    )
  );
