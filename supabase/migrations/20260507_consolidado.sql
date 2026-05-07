-- =====================================================================
-- MIGRACIÓN CONSOLIDADA — Agro360 / AgroSantander360
-- Fecha: 2026-05-07
--
-- Consolida todas las migraciones anteriores en un solo script idempotente.
-- Seguro de ejecutar aunque ya se hayan aplicado cambios parciales.
--
-- Secciones:
--   1. Cambios estructurales (columnas, constraints, datos)
--   2. Funciones SECURITY DEFINER (RLS helpers)
--   3. Políticas RLS (estado final — todas las tablas)
--   4. Permisos de ejecución
-- =====================================================================


-- =====================================================================
-- SECCIÓN 1 — CAMBIOS ESTRUCTURALES
-- =====================================================================

-- -------------------------
-- 1.1 caracterizaciones
-- -------------------------
ALTER TABLE public.caracterizaciones
  ADD COLUMN IF NOT EXISTS estado character varying DEFAULT 'INICIADO'::character varying,
  ADD COLUMN IF NOT EXISTS foto_beneficiario_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS foto_doc_frontal_url  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS foto_doc_trasera_url  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS autorizacion_aviso_privacidad BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS autorizacion_uso_imagen       BOOLEAN DEFAULT FALSE;

-- Rellenar estado NULL con INICIADO en registros existentes
UPDATE public.caracterizaciones
SET estado = 'INICIADO'
WHERE estado IS NULL;

-- -------------------------
-- 1.2 visitas
-- -------------------------
-- Columna 'estado' migrada a caracterizaciones; eliminarla de visitas
ALTER TABLE public.visitas DROP COLUMN IF EXISTS estado;

-- -------------------------
-- 1.3 beneficiarios
-- -------------------------
ALTER TABLE public.beneficiarios
  DROP COLUMN  IF EXISTS foto_url,
  ADD COLUMN   IF NOT EXISTS fecha_nacimiento              DATE,
  ADD COLUMN   IF NOT EXISTS nombre_contacto_secundario   VARCHAR(200),
  ADD COLUMN   IF NOT EXISTS telefono_secundario          VARCHAR(20),
  ADD COLUMN   IF NOT EXISTS parentesco_contacto_secundario VARCHAR(50),
  ADD COLUMN   IF NOT EXISTS asociacion                   TEXT;

COMMENT ON COLUMN beneficiarios.fecha_nacimiento IS 'Fecha de nacimiento del beneficiario (YYYY-MM-DD)';

-- Eliminar CHECK constraints cuyos valores no coinciden con los del formulario
-- (la validación la realizan los Select/Input del formulario con opciones fijas)
ALTER TABLE public.beneficiarios
  DROP CONSTRAINT IF EXISTS beneficiarios_genero_check,
  DROP CONSTRAINT IF EXISTS beneficiarios_tipo_documento_check,
  DROP CONSTRAINT IF EXISTS beneficiarios_personas_cargo_check;

-- Índice único para evitar duplicados en sincronizaciones concurrentes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.beneficiarios'::regclass
      AND contype = 'u'
      AND conname LIKE '%numero_documento%'
  ) THEN
    ALTER TABLE public.beneficiarios
      ADD CONSTRAINT beneficiarios_numero_documento_unique UNIQUE (numero_documento);
  END IF;
END $$;

-- -------------------------
-- 1.4 predios
-- -------------------------
-- Constraint de tipo_tenencia no coincide con valores del formulario
ALTER TABLE public.predios
  DROP CONSTRAINT IF EXISTS predios_tipo_tenencia_check;

-- -------------------------
-- 1.5 caracterizacion_predio
-- -------------------------
ALTER TABLE public.caracterizacion_predio
  DROP CONSTRAINT IF EXISTS caracterizacion_predio_topografia_check;

-- -------------------------
-- 1.6 area_productiva
-- -------------------------
ALTER TABLE public.area_productiva
  DROP CONSTRAINT IF EXISTS area_productiva_estado_cultivo_check,
  ADD COLUMN IF NOT EXISTS sistema_productivo_interes TEXT,
  ADD COLUMN IF NOT EXISTS hectareas_siembra_nueva    NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS hectareas_renovacion       NUMERIC(10, 2);

-- -------------------------
-- 1.7 profiles
-- -------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS numero_documento VARCHAR(20);

-- Actualizar rol 'campesino' → 'agricultor' y CHECK constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;

UPDATE public.profiles
SET rol = 'agricultor'
WHERE rol = 'campesino';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{rol}', '"agricultor"')
WHERE raw_user_meta_data ->> 'rol' = 'campesino';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_rol_check
  CHECK (rol IN ('admin','asesor','agricultor','analista'));


-- =====================================================================
-- SECCIÓN 2 — FUNCIONES SECURITY DEFINER (RLS helpers)
-- =====================================================================

-- mi_rol(): devuelve el rol del usuario autenticado sin activar RLS en profiles
CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT rol FROM public.profiles WHERE id = auth.uid()
$$;

-- get_user_role(): versión con parámetro uid (usada por políticas de profiles)
CREATE OR REPLACE FUNCTION public.get_user_role(uid UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.profiles WHERE id = uid;
$$;

-- agricultor_tiene_visita(): comprueba acceso de agricultor a una visita
-- sin crear recursión mutua entre visitas ↔ beneficiarios
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


-- =====================================================================
-- SECCIÓN 3 — POLÍTICAS RLS (estado final)
-- =====================================================================

-- -------------------------
-- 3.1 profiles
-- Estado final: 20260428_fix_rls_profiles.sql
-- -------------------------

-- Eliminar todas las políticas existentes en profiles
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- SELECT: propio usuario; admin y analista ven todos
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('admin', 'analista')
  );

-- INSERT: service_role (registro via API) o el propio usuario
CREATE POLICY "profiles_insert_service" ON public.profiles
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- UPDATE: propio usuario o admin
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR public.get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    id = auth.uid()
    OR public.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "profiles_update_service" ON public.profiles
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

-- DELETE
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "profiles_delete_service" ON public.profiles
  FOR DELETE TO service_role
  USING (true);

-- -------------------------
-- 3.2 visitas
-- Estado final: 20260428_fix_visitas_agricultor.sql (reemplaza visitas_select de 20260427)
-- -------------------------
DROP POLICY IF EXISTS "visitas_select_own" ON visitas;
DROP POLICY IF EXISTS "visitas_insert_own" ON visitas;
DROP POLICY IF EXISTS "visitas_update_own" ON visitas;
DROP POLICY IF EXISTS "visitas_delete_admin" ON visitas;
DROP POLICY IF EXISTS "visitas_select"  ON visitas;
DROP POLICY IF EXISTS "visitas_insert"  ON visitas;
DROP POLICY IF EXISTS "visitas_update"  ON visitas;
DROP POLICY IF EXISTS "visitas_delete"  ON visitas;

-- SELECT: admin/analista ven todo; asesor ve las suyas;
--         agricultor via SECURITY DEFINER (sin recursión)
CREATE POLICY "visitas_select" ON visitas
  FOR SELECT TO authenticated
  USING (
    public.mi_rol() IN ('admin', 'analista')
    OR auth.uid() = asesor_id
    OR public.agricultor_tiene_visita(visitas.id)
  );

CREATE POLICY "visitas_insert" ON visitas
  FOR INSERT WITH CHECK (
    auth.uid() = asesor_id
    OR public.mi_rol() IN ('admin', 'asesor')
  );

CREATE POLICY "visitas_update" ON visitas
  FOR UPDATE USING (
    auth.uid() = asesor_id
    OR public.mi_rol() = 'admin'
  );

CREATE POLICY "visitas_delete" ON visitas
  FOR DELETE USING (public.mi_rol() = 'admin');

-- -------------------------
-- 3.3 beneficiarios
-- -------------------------
DROP POLICY IF EXISTS "beneficiarios_select" ON beneficiarios;
DROP POLICY IF EXISTS "beneficiarios_insert" ON beneficiarios;
DROP POLICY IF EXISTS "beneficiarios_update" ON beneficiarios;
DROP POLICY IF EXISTS "beneficiarios_delete" ON beneficiarios;

CREATE POLICY "beneficiarios_select" ON beneficiarios
  FOR SELECT USING (
    public.mi_rol() IN ('admin', 'analista')
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
    public.mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = id_visita AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "beneficiarios_update" ON beneficiarios
  FOR UPDATE USING (
    public.mi_rol() IN ('admin', 'analista')
    OR EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = beneficiarios.id_visita AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "beneficiarios_delete" ON beneficiarios
  FOR DELETE USING (public.mi_rol() = 'admin');

-- -------------------------
-- 3.4 predios
-- -------------------------
DROP POLICY IF EXISTS "predios_select" ON predios;
DROP POLICY IF EXISTS "predios_insert" ON predios;
DROP POLICY IF EXISTS "predios_update" ON predios;
DROP POLICY IF EXISTS "predios_delete" ON predios;

CREATE POLICY "predios_select" ON predios
  FOR SELECT USING (
    public.mi_rol() IN ('admin', 'analista')
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
    public.mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM beneficiarios b
      JOIN visitas v ON v.id = b.id_visita
      WHERE b.id = id_beneficiario AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "predios_update" ON predios
  FOR UPDATE USING (
    public.mi_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM beneficiarios b
      JOIN visitas v ON v.id = b.id_visita
      WHERE b.id = predios.id_beneficiario AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "predios_delete" ON predios
  FOR DELETE USING (public.mi_rol() = 'admin');

-- -------------------------
-- 3.5 caracterizacion_predio
-- -------------------------
DROP POLICY IF EXISTS "caracterizacion_predio_select" ON caracterizacion_predio;
DROP POLICY IF EXISTS "caracterizacion_predio_insert" ON caracterizacion_predio;
DROP POLICY IF EXISTS "caracterizacion_predio_update" ON caracterizacion_predio;
DROP POLICY IF EXISTS "caracterizacion_predio_delete" ON caracterizacion_predio;

CREATE POLICY "caracterizacion_predio_select" ON caracterizacion_predio
  FOR SELECT USING (
    public.mi_rol() IN ('admin', 'analista')
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
    public.mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "caracterizacion_predio_update" ON caracterizacion_predio
  FOR UPDATE USING (
    public.mi_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = caracterizacion_predio.id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "caracterizacion_predio_delete" ON caracterizacion_predio
  FOR DELETE USING (public.mi_rol() = 'admin');

-- -------------------------
-- 3.6 abastecimiento_agua
-- -------------------------
DROP POLICY IF EXISTS "abastecimiento_agua_select" ON abastecimiento_agua;
DROP POLICY IF EXISTS "abastecimiento_agua_insert" ON abastecimiento_agua;
DROP POLICY IF EXISTS "abastecimiento_agua_update" ON abastecimiento_agua;
DROP POLICY IF EXISTS "abastecimiento_agua_delete" ON abastecimiento_agua;

CREATE POLICY "abastecimiento_agua_select" ON abastecimiento_agua
  FOR SELECT USING (
    public.mi_rol() IN ('admin', 'analista')
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
    public.mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "abastecimiento_agua_update" ON abastecimiento_agua
  FOR UPDATE USING (
    public.mi_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = abastecimiento_agua.id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "abastecimiento_agua_delete" ON abastecimiento_agua
  FOR DELETE USING (public.mi_rol() = 'admin');

-- -------------------------
-- 3.7 riesgos_predio
-- -------------------------
DROP POLICY IF EXISTS "riesgos_predio_select" ON riesgos_predio;
DROP POLICY IF EXISTS "riesgos_predio_insert" ON riesgos_predio;
DROP POLICY IF EXISTS "riesgos_predio_update" ON riesgos_predio;
DROP POLICY IF EXISTS "riesgos_predio_delete" ON riesgos_predio;

CREATE POLICY "riesgos_predio_select" ON riesgos_predio
  FOR SELECT USING (
    public.mi_rol() IN ('admin', 'analista')
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
    public.mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "riesgos_predio_update" ON riesgos_predio
  FOR UPDATE USING (
    public.mi_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = riesgos_predio.id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "riesgos_predio_delete" ON riesgos_predio
  FOR DELETE USING (public.mi_rol() = 'admin');

-- -------------------------
-- 3.8 area_productiva
-- -------------------------
DROP POLICY IF EXISTS "area_productiva_select" ON area_productiva;
DROP POLICY IF EXISTS "area_productiva_insert" ON area_productiva;
DROP POLICY IF EXISTS "area_productiva_update" ON area_productiva;
DROP POLICY IF EXISTS "area_productiva_delete" ON area_productiva;

CREATE POLICY "area_productiva_select" ON area_productiva
  FOR SELECT USING (
    public.mi_rol() IN ('admin', 'analista')
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
    public.mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "area_productiva_update" ON area_productiva
  FOR UPDATE USING (
    public.mi_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM predios pr
      JOIN beneficiarios b ON b.id = pr.id_beneficiario
      JOIN visitas v ON v.id = b.id_visita
      WHERE pr.id = area_productiva.id_predio AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "area_productiva_delete" ON area_productiva
  FOR DELETE USING (public.mi_rol() = 'admin');

-- -------------------------
-- 3.9 informacion_financiera
-- -------------------------
DROP POLICY IF EXISTS "informacion_financiera_select" ON informacion_financiera;
DROP POLICY IF EXISTS "informacion_financiera_insert" ON informacion_financiera;
DROP POLICY IF EXISTS "informacion_financiera_update" ON informacion_financiera;
DROP POLICY IF EXISTS "informacion_financiera_delete" ON informacion_financiera;

CREATE POLICY "informacion_financiera_select" ON informacion_financiera
  FOR SELECT USING (
    public.mi_rol() IN ('admin', 'analista')
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
    public.mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM beneficiarios b
      JOIN visitas v ON v.id = b.id_visita
      WHERE b.id = id_beneficiario AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "informacion_financiera_update" ON informacion_financiera
  FOR UPDATE USING (
    public.mi_rol() IN ('admin', 'analista')
    OR EXISTS (
      SELECT 1 FROM beneficiarios b
      JOIN visitas v ON v.id = b.id_visita
      WHERE b.id = informacion_financiera.id_beneficiario AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "informacion_financiera_delete" ON informacion_financiera
  FOR DELETE USING (public.mi_rol() = 'admin');

-- -------------------------
-- 3.10 caracterizaciones
-- -------------------------
DROP POLICY IF EXISTS "update_estado_caracterizaciones" ON caracterizaciones;
DROP POLICY IF EXISTS "caracterizaciones_select" ON caracterizaciones;
DROP POLICY IF EXISTS "caracterizaciones_insert" ON caracterizaciones;
DROP POLICY IF EXISTS "caracterizaciones_update" ON caracterizaciones;
DROP POLICY IF EXISTS "caracterizaciones_delete" ON caracterizaciones;

CREATE POLICY "caracterizaciones_select" ON caracterizaciones
  FOR SELECT USING (
    public.mi_rol() IN ('admin', 'analista')
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
    public.mi_rol() IN ('admin', 'asesor')
    OR EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = id_visita AND v.asesor_id = auth.uid()
    )
  );

-- asesor edita las suyas; analista puede cambiar estado; admin todo
CREATE POLICY "caracterizaciones_update" ON caracterizaciones
  FOR UPDATE USING (
    public.mi_rol() = 'admin'
    OR public.mi_rol() = 'analista'
    OR EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = caracterizaciones.id_visita AND v.asesor_id = auth.uid()
    )
  );

CREATE POLICY "caracterizaciones_delete" ON caracterizaciones
  FOR DELETE USING (public.mi_rol() = 'admin');

-- -------------------------
-- 3.11 invitations
-- -------------------------
DROP POLICY IF EXISTS "invitations_select" ON invitations;
DROP POLICY IF EXISTS "invitations_insert" ON invitations;
DROP POLICY IF EXISTS "invitations_update" ON invitations;
DROP POLICY IF EXISTS "invitations_delete" ON invitations;

CREATE POLICY "invitations_select" ON invitations
  FOR SELECT USING (
    public.mi_rol() = 'admin'
    OR invitado_por = auth.uid()
  );

CREATE POLICY "invitations_insert" ON invitations
  FOR INSERT WITH CHECK (
    public.mi_rol() IN ('admin', 'asesor')
  );

CREATE POLICY "invitations_update" ON invitations
  FOR UPDATE USING (public.mi_rol() = 'admin');

CREATE POLICY "invitations_delete" ON invitations
  FOR DELETE USING (public.mi_rol() = 'admin');


-- =====================================================================
-- SECCIÓN 4 — PERMISOS DE EJECUCIÓN
-- =====================================================================
GRANT EXECUTE ON FUNCTION public.mi_rol()                      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.agricultor_tiene_visita(UUID) TO authenticated;
