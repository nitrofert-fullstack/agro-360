-- ============================================================
-- Fix: infinite recursion en políticas de la tabla profiles
-- Causa: una política en profiles consultaba profiles para
--        verificar si el usuario es admin → recursión infinita.
-- Solución: función SECURITY DEFINER que bypasea RLS.
-- ============================================================

-- 1. Función auxiliar (SECURITY DEFINER = corre como postgres,
--    sin activar RLS, por eso rompe la recursión)
CREATE OR REPLACE FUNCTION public.get_user_role(uid UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.profiles WHERE id = uid;
$$;

-- 2. Eliminar TODAS las políticas existentes en profiles
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

-- 3. Nuevas políticas sin recursión
--    SELECT: cada usuario ve su propio perfil; admin/analista ven todos
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('admin', 'analista')
  );

--    INSERT: solo service_role puede insertar (registro vía API)
CREATE POLICY "profiles_insert_service" ON public.profiles
  FOR INSERT TO service_role
  WITH CHECK (true);

--    INSERT autenticado: solo el propio usuario (edge case registro)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

--    UPDATE: propio usuario o admin
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

--    UPDATE service_role (toggle-user, change-role)
CREATE POLICY "profiles_update_service" ON public.profiles
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

--    DELETE: solo admin
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "profiles_delete_service" ON public.profiles
  FOR DELETE TO service_role
  USING (true);
