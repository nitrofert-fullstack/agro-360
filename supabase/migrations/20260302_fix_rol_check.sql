-- Migración: agregar rol 'analista' al check constraint de profiles
-- Error original: new row for relation "profiles" violates check constraint "profiles_rol_check"
-- El constraint anterior no incluía 'analista', causando error 23514 al cambiar roles.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_rol_check
  CHECK (rol IN ('admin', 'asesor', 'analista', 'campesino'));
