-- =============================================================
-- MIGRACIÓN: Políticas RLS completas y corregidas — Agro360
-- Fecha: 2026-04-27
--
-- Problemas que resuelve:
--  1. Recursión infinita en profiles (GET devuelve vacío)
--  2. Rol analista sin acceso SELECT en ninguna tabla
--  3. Rol agricultor sin acceso SELECT a sus propios registros
--  4. Registros con asesor_id NULL (envíos públicos) invisibles para admin/analista
--  5. Políticas UPDATE faltantes en sub-tablas de predio
--  6. Políticas DELETE faltantes
--
-- Es idempotente: usa DROP POLICY IF EXISTS antes de cada CREATE.
-- Segura de reejecutar.
-- =============================================================

-- =============================================================
-- PASO 1: Función helper SECURITY DEFINER para leer el propio rol
-- Sin esta función, las políticas de visitas/caracterizaciones que
-- verifican profiles.rol causan recursión cuando profiles tiene RLS.
-- =============================================================
CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT rol FROM public.profiles WHERE id = auth.uid()
$$;

-- =============================================================
-- PASO 2: profiles
-- SELECT: propio usuario O admin (usando jwt claim para evitar recursión)
-- =============================================================
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
-- Nombres creados por 20260428_fix_rls_profiles.sql (por si ya fue ejecutado)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_service" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_update_service" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_service" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    auth.uid() = id
    OR (auth.jwt() ->> 'rol') = 'admin'
    OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'rol' = 'admin'
  );

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR mi_rol() = 'admin'
  );

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (mi_rol() = 'admin');

-- =============================================================
-- PASO 3: visitas
-- admin y analista ven TODAS (incluyendo asesor_id NULL)
-- asesor ve las suyas (asesor_id = auth.uid())
-- agricultor NO ve visitas directamente
-- =============================================================
DROP POLICY IF EXISTS "visitas_select_own" ON visitas;
DROP POLICY IF EXISTS "visitas_insert_own" ON visitas;
DROP POLICY IF EXISTS "visitas_update_own" ON visitas;
DROP POLICY IF EXISTS "visitas_delete_admin" ON visitas;

CREATE POLICY "visitas_select" ON visitas
  FOR SELECT USING (
    mi_rol() IN ('admin', 'analista')
    OR auth.uid() = asesor_id
  );

CREATE POLICY "visitas_insert" ON visitas
  FOR INSERT WITH CHECK (
    auth.uid() = asesor_id
    OR mi_rol() IN ('admin', 'asesor')
  );

CREATE POLICY "visitas_update" ON visitas
  FOR UPDATE USING (
    auth.uid() = asesor_id
    OR mi_rol() = 'admin'
  );

CREATE POLICY "visitas_delete" ON visitas
  FOR DELETE USING (mi_rol() = 'admin');

-- =============================================================
-- PASO 4: beneficiarios
-- admin/analista: todos
-- asesor: los de sus visitas
-- agricultor: el suyo (numero_documento coincide con profiles)
-- =============================================================
DROP POLICY IF EXISTS "beneficiarios_select" ON beneficiarios;
DROP POLICY IF EXISTS "beneficiarios_insert" ON beneficiarios;
DROP POLICY IF EXISTS "beneficiarios_update" ON beneficiarios;
DROP POLICY IF EXISTS "beneficiarios_delete" ON beneficiarios;

CREATE POLICY "beneficiarios_select" ON beneficiarios
  FOR SELECT USING (
    mi_rol() IN ('admin', 'analista')
    OR EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = beneficiarios.id_visita
        AND v.asesor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.numero_documento IS NOT NULL
        AND p.numero_documento = beneficiarios.numero_documento
    )
  );

CREATE POLICY "beneficiarios_insert" ON beneficiarios
  FOR INSERT WITH CHECK (
    mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = id_visita AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "beneficiarios_update" ON beneficiarios
  FOR UPDATE USING (
    mi_rol() IN ('admin', 'analista')
    OR EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = beneficiarios.id_visita AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "beneficiarios_delete" ON beneficiarios
  FOR DELETE USING (mi_rol() = 'admin');

-- =============================================================
-- PASO 5: predios
-- =============================================================
DROP POLICY IF EXISTS "predios_select" ON predios;
DROP POLICY IF EXISTS "predios_insert" ON predios;
DROP POLICY IF EXISTS "predios_update" ON predios;
DROP POLICY IF EXISTS "predios_delete" ON predios;

CREATE POLICY "predios_select" ON predios
  FOR SELECT USING (
    mi_rol() IN ('admin', 'analista')
    OR EXISTS (
      SELECT 1 FROM beneficiarios b
      JOIN visitas v ON v.id = b.id_visita
      WHERE b.id = predios.id_beneficiario
        AND v.asesor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM beneficiarios b
      JOIN profiles p ON p.numero_documento = b.numero_documento
      WHERE b.id = predios.id_beneficiario
        AND p.id = auth.uid()
        AND p.numero_documento IS NOT NULL
    )
  );

CREATE POLICY "predios_insert" ON predios
  FOR INSERT WITH CHECK (
    mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM beneficiarios b
      JOIN visitas v ON v.id = b.id_visita
      WHERE b.id = id_beneficiario AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "predios_update" ON predios
  FOR UPDATE USING (
    mi_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM beneficiarios b
      JOIN visitas v ON v.id = b.id_visita
      WHERE b.id = predios.id_beneficiario AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "predios_delete" ON predios
  FOR DELETE USING (mi_rol() = 'admin');

-- =============================================================
-- PASO 6: caracterizacion_predio
-- =============================================================
DROP POLICY IF EXISTS "caracterizacion_predio_select" ON caracterizacion_predio;
DROP POLICY IF EXISTS "caracterizacion_predio_insert" ON caracterizacion_predio;
DROP POLICY IF EXISTS "caracterizacion_predio_update" ON caracterizacion_predio;
DROP POLICY IF EXISTS "caracterizacion_predio_delete" ON caracterizacion_predio;

CREATE POLICY "caracterizacion_predio_select" ON caracterizacion_predio
  FOR SELECT USING (
    mi_rol() IN ('admin', 'analista')
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = caracterizacion_predio.id_predio
        AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "caracterizacion_predio_insert" ON caracterizacion_predio
  FOR INSERT WITH CHECK (
    mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "caracterizacion_predio_update" ON caracterizacion_predio
  FOR UPDATE USING (
    mi_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = caracterizacion_predio.id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "caracterizacion_predio_delete" ON caracterizacion_predio
  FOR DELETE USING (mi_rol() = 'admin');

-- =============================================================
-- PASO 7: abastecimiento_agua
-- =============================================================
DROP POLICY IF EXISTS "abastecimiento_agua_select" ON abastecimiento_agua;
DROP POLICY IF EXISTS "abastecimiento_agua_insert" ON abastecimiento_agua;
DROP POLICY IF EXISTS "abastecimiento_agua_update" ON abastecimiento_agua;
DROP POLICY IF EXISTS "abastecimiento_agua_delete" ON abastecimiento_agua;

CREATE POLICY "abastecimiento_agua_select" ON abastecimiento_agua
  FOR SELECT USING (
    mi_rol() IN ('admin', 'analista')
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = abastecimiento_agua.id_predio
        AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "abastecimiento_agua_insert" ON abastecimiento_agua
  FOR INSERT WITH CHECK (
    mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "abastecimiento_agua_update" ON abastecimiento_agua
  FOR UPDATE USING (
    mi_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = abastecimiento_agua.id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "abastecimiento_agua_delete" ON abastecimiento_agua
  FOR DELETE USING (mi_rol() = 'admin');

-- =============================================================
-- PASO 8: riesgos_predio
-- =============================================================
DROP POLICY IF EXISTS "riesgos_predio_select" ON riesgos_predio;
DROP POLICY IF EXISTS "riesgos_predio_insert" ON riesgos_predio;
DROP POLICY IF EXISTS "riesgos_predio_update" ON riesgos_predio;
DROP POLICY IF EXISTS "riesgos_predio_delete" ON riesgos_predio;

CREATE POLICY "riesgos_predio_select" ON riesgos_predio
  FOR SELECT USING (
    mi_rol() IN ('admin', 'analista')
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = riesgos_predio.id_predio
        AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "riesgos_predio_insert" ON riesgos_predio
  FOR INSERT WITH CHECK (
    mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "riesgos_predio_update" ON riesgos_predio
  FOR UPDATE USING (
    mi_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = riesgos_predio.id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "riesgos_predio_delete" ON riesgos_predio
  FOR DELETE USING (mi_rol() = 'admin');

-- =============================================================
-- PASO 9: area_productiva
-- =============================================================
DROP POLICY IF EXISTS "area_productiva_select" ON area_productiva;
DROP POLICY IF EXISTS "area_productiva_insert" ON area_productiva;
DROP POLICY IF EXISTS "area_productiva_update" ON area_productiva;
DROP POLICY IF EXISTS "area_productiva_delete" ON area_productiva;

CREATE POLICY "area_productiva_select" ON area_productiva
  FOR SELECT USING (
    mi_rol() IN ('admin', 'analista')
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = area_productiva.id_predio
        AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "area_productiva_insert" ON area_productiva
  FOR INSERT WITH CHECK (
    mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "area_productiva_update" ON area_productiva
  FOR UPDATE USING (
    mi_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = area_productiva.id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "area_productiva_delete" ON area_productiva
  FOR DELETE USING (mi_rol() = 'admin');

-- =============================================================
-- PASO 10: informacion_financiera
-- =============================================================
DROP POLICY IF EXISTS "informacion_financiera_select" ON informacion_financiera;
DROP POLICY IF EXISTS "informacion_financiera_insert" ON informacion_financiera;
DROP POLICY IF EXISTS "informacion_financiera_update" ON informacion_financiera;
DROP POLICY IF EXISTS "informacion_financiera_delete" ON informacion_financiera;

CREATE POLICY "informacion_financiera_select" ON informacion_financiera
  FOR SELECT USING (
    mi_rol() IN ('admin', 'analista')
    OR EXISTS (
      SELECT 1 FROM beneficiarios b
      JOIN visitas v ON v.id = b.id_visita
      WHERE b.id = informacion_financiera.id_beneficiario
        AND v.asesor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM beneficiarios b
      JOIN profiles p ON p.numero_documento = b.numero_documento
      WHERE b.id = informacion_financiera.id_beneficiario
        AND p.id = auth.uid()
        AND p.numero_documento IS NOT NULL
    )
  );

CREATE POLICY "informacion_financiera_insert" ON informacion_financiera
  FOR INSERT WITH CHECK (
    mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM beneficiarios b
      JOIN visitas v ON v.id = b.id_visita
      WHERE b.id = id_beneficiario AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "informacion_financiera_update" ON informacion_financiera
  FOR UPDATE USING (
    mi_rol() IN ('admin', 'analista')
    OR EXISTS (
      SELECT 1 FROM beneficiarios b
      JOIN visitas v ON v.id = b.id_visita
      WHERE b.id = informacion_financiera.id_beneficiario AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "informacion_financiera_delete" ON informacion_financiera
  FOR DELETE USING (mi_rol() = 'admin');

-- =============================================================
-- PASO 11: caracterizaciones
-- Tabla central — agricultor ve la suya via numero_documento
-- =============================================================
DROP POLICY IF EXISTS "caracterizaciones_select" ON caracterizaciones;
DROP POLICY IF EXISTS "caracterizaciones_insert" ON caracterizaciones;
DROP POLICY IF EXISTS "caracterizaciones_update" ON caracterizaciones;
DROP POLICY IF EXISTS "caracterizaciones_delete" ON caracterizaciones;

CREATE POLICY "caracterizaciones_select" ON caracterizaciones
  FOR SELECT USING (
    mi_rol() IN ('admin', 'analista')
    OR EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = caracterizaciones.id_visita
        AND v.asesor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM beneficiarios b
      JOIN profiles p ON p.numero_documento = b.numero_documento
      WHERE b.id = caracterizaciones.id_beneficiario
        AND p.id = auth.uid()
        AND p.numero_documento IS NOT NULL
    )
  );

CREATE POLICY "caracterizaciones_insert" ON caracterizaciones
  FOR INSERT WITH CHECK (
    mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = id_visita AND v.asesor_id = auth.uid()
    )
  );

-- UPDATE: asesor puede editar sus propias; analista puede cambiar estado; admin todo
CREATE POLICY "caracterizaciones_update" ON caracterizaciones
  FOR UPDATE USING (
    mi_rol() = 'admin'
    OR mi_rol() = 'analista'
    OR EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = caracterizaciones.id_visita AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "caracterizaciones_delete" ON caracterizaciones
  FOR DELETE USING (mi_rol() = 'admin');

-- =============================================================
-- PASO 12: invitations
-- =============================================================
DROP POLICY IF EXISTS "invitations_select" ON invitations;
DROP POLICY IF EXISTS "invitations_insert" ON invitations;
DROP POLICY IF EXISTS "invitations_update" ON invitations;
DROP POLICY IF EXISTS "invitations_delete" ON invitations;

CREATE POLICY "invitations_select" ON invitations
  FOR SELECT USING (
    mi_rol() = 'admin'
    OR invitado_por = auth.uid()
  );

CREATE POLICY "invitations_insert" ON invitations
  FOR INSERT WITH CHECK (
    mi_rol() IN ('admin', 'asesor')
  );

CREATE POLICY "invitations_update" ON invitations
  FOR UPDATE USING (mi_rol() = 'admin');

CREATE POLICY "invitations_delete" ON invitations
  FOR DELETE USING (mi_rol() = 'admin');

-- =============================================================
-- PASO 13: Otorgar permisos de ejecución en mi_rol() al rol anon y authenticated
-- =============================================================
GRANT EXECUTE ON FUNCTION public.mi_rol() TO anon, authenticated;
