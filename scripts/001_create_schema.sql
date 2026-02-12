-- Tabla de perfiles (asesores)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'asesor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de caracterizaciones (formularios guardados)
CREATE TABLE IF NOT EXISTS public.caracterizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  radicado_local TEXT NOT NULL UNIQUE,
  radicado_oficial TEXT UNIQUE,
  documento_productor TEXT NOT NULL,
  nombre_productor TEXT NOT NULL,
  asesor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  asesor_email TEXT,
  estado TEXT DEFAULT 'PENDIENTE_SINCRONIZACION',
  datos_tecnico JSONB,
  informacion_familiar JSONB,
  datos_predio JSONB,
  descripcion_fisica JSONB,
  area_productiva JSONB,
  info_financiera JSONB,
  autorizacion JSONB,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  fecha_sincronizacion TIMESTAMPTZ,
  intentos_sincronizacion INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de invitaciones
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  tipo TEXT DEFAULT 'asesor',
  usado BOOLEAN DEFAULT FALSE,
  fecha_expiracion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caracterizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "caracterizaciones_select_own" ON public.caracterizaciones FOR SELECT USING (auth.uid() = asesor_id OR documento_productor IS NOT NULL);
CREATE POLICY "caracterizaciones_insert_own" ON public.caracterizaciones FOR INSERT WITH CHECK (auth.uid() = asesor_id);
CREATE POLICY "caracterizaciones_update_own" ON public.caracterizaciones FOR UPDATE USING (auth.uid() = asesor_id);

-- Trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'asesor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
