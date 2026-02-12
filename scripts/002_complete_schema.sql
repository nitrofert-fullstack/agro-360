-- =============================================
-- AGROSANTANDER360 - ESQUEMA COMPLETO DE BASE DE DATOS
-- =============================================

-- Tabla de perfiles de usuarios (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre_completo TEXT,
  rol TEXT CHECK (rol IN ('asesor', 'admin', 'campesino')) DEFAULT 'asesor',
  telefono TEXT,
  estado TEXT CHECK (estado IN ('activo', 'inactivo', 'suspendido')) DEFAULT 'activo',
  foto_perfil_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla principal de caracterizaciones
CREATE TABLE IF NOT EXISTS public.caracterizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  radicado_local TEXT UNIQUE NOT NULL,
  radicado_oficial TEXT UNIQUE,
  estado TEXT CHECK (estado IN ('pendiente_sincronizacion', 'sincronizado', 'en_revision', 'aprobado', 'rechazado')) DEFAULT 'pendiente_sincronizacion',
  
  -- Relaciones
  asesor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  asesor_email TEXT,
  campesino_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Datos del técnico
  nombre_tecnico TEXT NOT NULL,
  fecha_caracterizacion DATE NOT NULL,
  departamento TEXT DEFAULT 'Santander',
  municipio TEXT NOT NULL,
  corregimiento TEXT,
  vereda TEXT NOT NULL,
  
  -- Información familiar
  nombre_productor TEXT NOT NULL,
  tipo_documento TEXT CHECK (tipo_documento IN ('CC', 'CE', 'TI', 'PEP')) DEFAULT 'CC',
  numero_documento TEXT NOT NULL,
  genero TEXT CHECK (genero IN ('Masculino', 'Femenino', 'Otro', 'Prefiero no decir')),
  fecha_nacimiento DATE,
  estado_civil TEXT,
  telefono TEXT,
  email TEXT,
  nivel_educativo TEXT,
  grupo_etnico TEXT,
  discapacidad TEXT CHECK (discapacidad IN ('Si', 'No')),
  tipo_discapacidad TEXT,
  pertenece_asociacion TEXT CHECK (pertenece_asociacion IN ('Si', 'No')),
  nombre_asociacion TEXT,
  numero_personas_hogar INTEGER DEFAULT 1,
  personas_mayores_60 INTEGER DEFAULT 0,
  personas_menores_18 INTEGER DEFAULT 0,
  
  -- Datos del predio
  nombre_predio TEXT NOT NULL,
  tipo_tenencia TEXT,
  area_total NUMERIC(10, 2),
  area_cultivada NUMERIC(10, 2),
  tipo_ubicacion TEXT CHECK (tipo_ubicacion IN ('punto', 'poligono')) DEFAULT 'punto',
  latitud NUMERIC(10, 6),
  longitud NUMERIC(10, 6),
  poligono JSONB, -- Array de coordenadas [[lat,lng], [lat,lng], ...]
  altitud NUMERIC(10, 2),
  fuente_agua TEXT,
  acceso_vial TEXT,
  distancia_cabecera NUMERIC(10, 2),
  
  -- Descripción física
  topografia TEXT,
  tipo_suelo TEXT,
  erosion TEXT,
  drenaje TEXT,
  cobertura_vegetal TEXT,
  
  -- Área productiva
  cultivo_principal TEXT,
  area_cultivo_principal NUMERIC(10, 2),
  cultivos_secundarios JSONB, -- Array de objetos {nombre, area}
  sistemas_produccion JSONB, -- Array de strings
  tiene_ganado TEXT CHECK (tiene_ganado IN ('Si', 'No')),
  tipo_ganado TEXT,
  cantidad_ganado INTEGER,
  
  -- Información financiera
  ingresos_mensuales TEXT,
  fuentes_ingreso JSONB, -- Array de strings
  acceso_credito TEXT CHECK (acceso_credito IN ('Si', 'No')),
  entidad_credito TEXT,
  monto_credito NUMERIC(12, 2),
  recibe_subsidios TEXT CHECK (recibe_subsidios IN ('Si', 'No')),
  tipo_subsidios JSONB, -- Array de strings
  
  -- Autorización y firmas
  autoriza_tratamiento_datos BOOLEAN DEFAULT FALSE,
  firma_digital_url TEXT, -- URL en Supabase Storage
  foto_productor_url TEXT, -- URL en Supabase Storage
  fecha_autorizacion TIMESTAMPTZ,
  
  -- Sincronización
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  fecha_sincronizacion TIMESTAMPTZ,
  intentos_sincronizacion INTEGER DEFAULT 0,
  ultimo_error_sincronizacion TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices compuestos
  CONSTRAINT unique_documento_campesino UNIQUE (numero_documento)
);

-- Tabla de invitaciones
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  rol TEXT CHECK (rol IN ('asesor', 'campesino')) NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  estado TEXT CHECK (estado IN ('pendiente', 'aceptada', 'expirada', 'rechazada')) DEFAULT 'pendiente',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de archivos (para tracking de uploads)
CREATE TABLE IF NOT EXISTS public.archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caracterizacion_id UUID REFERENCES public.caracterizaciones(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('firma', 'foto_productor', 'documento_adicional')) NOT NULL,
  nombre_archivo TEXT NOT NULL,
  url TEXT NOT NULL,
  size_bytes INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de sincronizaciones (log de sincronización)
CREATE TABLE IF NOT EXISTS public.sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caracterizacion_id UUID REFERENCES public.caracterizaciones(id) ON DELETE CASCADE,
  asesor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  estado TEXT CHECK (estado IN ('exitoso', 'fallido')) NOT NULL,
  radicado_generado TEXT,
  error_mensaje TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =============================================

CREATE INDEX IF NOT EXISTS idx_caracterizaciones_asesor ON public.caracterizaciones(asesor_id);
CREATE INDEX IF NOT EXISTS idx_caracterizaciones_documento ON public.caracterizaciones(numero_documento);
CREATE INDEX IF NOT EXISTS idx_caracterizaciones_radicado_local ON public.caracterizaciones(radicado_local);
CREATE INDEX IF NOT EXISTS idx_caracterizaciones_radicado_oficial ON public.caracterizaciones(radicado_oficial);
CREATE INDEX IF NOT EXISTS idx_caracterizaciones_estado ON public.caracterizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_caracterizaciones_fecha_registro ON public.caracterizaciones(fecha_registro);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_archivos_caracterizacion ON public.archivos(caracterizacion_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caracterizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para caracterizaciones
CREATE POLICY "Asesores can view own caracterizaciones" ON public.caracterizaciones 
  FOR SELECT USING (asesor_id = auth.uid() OR campesino_id = auth.uid());
  
CREATE POLICY "Asesores can insert caracterizaciones" ON public.caracterizaciones 
  FOR INSERT WITH CHECK (asesor_id = auth.uid());
  
CREATE POLICY "Asesores can update own caracterizaciones" ON public.caracterizaciones 
  FOR UPDATE USING (asesor_id = auth.uid());

-- Políticas para archivos
CREATE POLICY "Users can view related archivos" ON public.archivos 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.caracterizaciones 
      WHERE caracterizaciones.id = archivos.caracterizacion_id 
      AND (caracterizaciones.asesor_id = auth.uid() OR caracterizaciones.campesino_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert archivos" ON public.archivos 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.caracterizaciones 
      WHERE caracterizaciones.id = archivos.caracterizacion_id 
      AND caracterizaciones.asesor_id = auth.uid()
    )
  );

-- Políticas para invitations (solo admins)
CREATE POLICY "Admins can manage invitations" ON public.invitations 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

-- Políticas para sync_log (solo el asesor que hizo la sincronización)
CREATE POLICY "Asesores can view own sync logs" ON public.sync_log 
  FOR SELECT USING (asesor_id = auth.uid());

-- =============================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_caracterizaciones_updated_at BEFORE UPDATE ON public.caracterizaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCIÓN PARA GENERAR RADICADO OFICIAL
-- =============================================

CREATE SEQUENCE IF NOT EXISTS radicado_secuencia START WITH 1;

CREATE OR REPLACE FUNCTION generar_radicado_oficial()
RETURNS TEXT AS $$
DECLARE
  numero INTEGER;
  radicado TEXT;
BEGIN
  numero := nextval('radicado_secuencia');
  radicado := 'RAD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(numero::TEXT, 5, '0');
  RETURN radicado;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGER PARA AUTO-CREATE PROFILE
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre_completo, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NULL),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'asesor')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STORAGE BUCKETS (Ejecutar en Supabase UI o CLI)
-- =============================================

-- Crear buckets manualmente en Supabase:
-- 1. 'firmas' - Para firmas digitales
-- 2. 'fotos-productores' - Para fotos de productores
-- 3. 'documentos' - Para documentos adicionales

-- Políticas de Storage (aplicar después de crear buckets):
-- 
-- Bucket: firmas
-- Policy: "Asesores can upload signatures"
-- INSERT: (bucket_id = 'firmas') AND (auth.role() = 'authenticated')
-- 
-- Policy: "Users can view signatures"
-- SELECT: (bucket_id = 'firmas') AND (auth.role() = 'authenticated')
--
-- Similar para fotos-productores y documentos
