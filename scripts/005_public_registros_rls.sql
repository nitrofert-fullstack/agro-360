-- Migración 005: Permitir que asesores vean registros públicos (asesor_id IS NULL)
-- Los registros enviados desde el formulario público no tienen asesor asignado,
-- pero deben ser visibles para que cualquier asesor o admin pueda revisarlos.

-- Visitas: ampliar select para incluir registros sin asesor
DROP POLICY IF EXISTS "visitas_select_own" ON visitas;
CREATE POLICY "visitas_select_own" ON visitas FOR SELECT USING (
  auth.uid() = asesor_id
  OR asesor_id IS NULL
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
);

-- Beneficiarios: ampliar select para incluir los de registros sin asesor
DROP POLICY IF EXISTS "beneficiarios_select" ON beneficiarios;
CREATE POLICY "beneficiarios_select" ON beneficiarios FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM visitas
    WHERE visitas.id = beneficiarios.id_visita
    AND (
      visitas.asesor_id = auth.uid()
      OR visitas.asesor_id IS NULL
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
    )
  )
);

-- Predios: ampliar select
DROP POLICY IF EXISTS "predios_select" ON predios;
CREATE POLICY "predios_select" ON predios FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM beneficiarios b JOIN visitas v ON v.id = b.id_visita
    WHERE b.id = predios.id_beneficiario
    AND (
      v.asesor_id = auth.uid()
      OR v.asesor_id IS NULL
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
    )
  )
);

-- Caracterizaciones: ampliar select
DROP POLICY IF EXISTS "caracterizaciones_select" ON caracterizaciones;
CREATE POLICY "caracterizaciones_select" ON caracterizaciones FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM visitas
    WHERE visitas.id = caracterizaciones.id_visita
    AND (
      visitas.asesor_id = auth.uid()
      OR visitas.asesor_id IS NULL
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
    )
  )
);
