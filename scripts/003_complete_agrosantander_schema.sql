-- =============================================================
-- ESQUEMA COMPLETO AGROSANTANDER360
-- Base de datos para gestión de beneficiarios
-- =============================================================

-- 1. TABLA: visitas
-- Información general de cada visita técnica realizada
CREATE TABLE IF NOT EXISTS visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_visita DATE NOT NULL,
  nombre_tecnico VARCHAR(100) NOT NULL,
  codigo_formulario VARCHAR(50),
  version_formulario VARCHAR(20) DEFAULT '1.0',
  fecha_emision_formulario DATE,
  radicado_local VARCHAR(100) UNIQUE,
  radicado_oficial VARCHAR(50) UNIQUE,
  estado VARCHAR(50) DEFAULT 'PENDIENTE_SINCRONIZACION',
  asesor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: beneficiarios
-- Información personal del núcleo familiar beneficiario
CREATE TABLE IF NOT EXISTS beneficiarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_visita UUID REFERENCES visitas(id) ON DELETE CASCADE,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  tipo_documento VARCHAR(10) NOT NULL CHECK (tipo_documento IN ('CC', 'CE', 'TI', 'PAS', 'NIT')),
  numero_documento VARCHAR(20) NOT NULL,
  edad INTEGER,
  telefono VARCHAR(20),
  correo VARCHAR(100),
  ocupacion_principal VARCHAR(100),
  foto_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: predios
-- Información general de los predios
CREATE TABLE IF NOT EXISTS predios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_beneficiario UUID NOT NULL REFERENCES beneficiarios(id) ON DELETE CASCADE,
  nombre_predio VARCHAR(100),
  departamento VARCHAR(50) NOT NULL DEFAULT 'Santander',
  municipio VARCHAR(50) NOT NULL,
  vereda VARCHAR(50),
  direccion VARCHAR(200),
  codigo_catastral VARCHAR(50),
  documento_tenencia VARCHAR(100),
  tipo_tenencia VARCHAR(50) CHECK (tipo_tenencia IN ('Propia', 'Posesion', 'Arriendo', 'Otro')),
  tipo_tenencia_otro VARCHAR(50),
  coordenada_x VARCHAR(50),
  coordenada_y VARCHAR(50),
  latitud DECIMAL(10, 8),
  longitud DECIMAL(11, 8),
  altitud_msnm DECIMAL(8, 2),
  vive_en_predio VARCHAR(10) CHECK (vive_en_predio IN ('Si', 'No', 'Cerca')),
  tiene_vivienda BOOLEAN DEFAULT FALSE,
  area_total_hectareas DECIMAL(10, 2),
  area_productiva_hectareas DECIMAL(10, 2),
  cultivos_existentes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: caracterizacion_predio
-- Información descriptiva y características del predio
CREATE TABLE IF NOT EXISTS caracterizacion_predio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_predio UUID NOT NULL UNIQUE REFERENCES predios(id) ON DELETE CASCADE,
  ruta_acceso TEXT,
  distancia_km DECIMAL(6, 2),
  tiempo_acceso VARCHAR(50),
  temperatura_celsius DECIMAL(4, 1),
  meses_lluvia VARCHAR(100),
  topografia VARCHAR(50) CHECK (topografia IN ('0-25% Plana', '26-50% Inclinada', '51%> Pendiente')),
  cobertura_bosque BOOLEAN DEFAULT FALSE,
  cobertura_cultivos BOOLEAN DEFAULT FALSE,
  cobertura_pastos BOOLEAN DEFAULT FALSE,
  cobertura_rastrojo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: abastecimiento_agua
-- Fuentes de abastecimiento de agua del predio
CREATE TABLE IF NOT EXISTS abastecimiento_agua (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_predio UUID NOT NULL REFERENCES predios(id) ON DELETE CASCADE,
  nacimiento_manantial BOOLEAN DEFAULT FALSE,
  rio_quebrada BOOLEAN DEFAULT FALSE,
  pozo BOOLEAN DEFAULT FALSE,
  acueducto_rural BOOLEAN DEFAULT FALSE,
  canal_distrito_riego BOOLEAN DEFAULT FALSE,
  jaguey_reservorio BOOLEAN DEFAULT FALSE,
  agua_lluvia BOOLEAN DEFAULT FALSE,
  otra_fuente VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: riesgos_predio
-- Riesgos identificados en el predio
CREATE TABLE IF NOT EXISTS riesgos_predio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_predio UUID NOT NULL REFERENCES predios(id) ON DELETE CASCADE,
  inundacion BOOLEAN DEFAULT FALSE,
  sequia BOOLEAN DEFAULT FALSE,
  viento BOOLEAN DEFAULT FALSE,
  helada BOOLEAN DEFAULT FALSE,
  otros_riesgos TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: area_productiva
-- Información del área productiva del predio
CREATE TABLE IF NOT EXISTS area_productiva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_predio UUID NOT NULL REFERENCES predios(id) ON DELETE CASCADE,
  sistema_productivo VARCHAR(100),
  caracterizacion_cultivo TEXT,
  cantidad_produccion VARCHAR(100),
  estado_cultivo VARCHAR(50) CHECK (estado_cultivo IN ('Tecnificado', 'En mal estado', 'NS/NR')),
  tiene_infraestructura_procesamiento BOOLEAN DEFAULT FALSE,
  estructuras TEXT,
  interesado_programa BOOLEAN DEFAULT FALSE,
  donde_comercializa TEXT,
  ingreso_mensual_ventas DECIMAL(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA: informacion_financiera
-- Información financiera del beneficiario
CREATE TABLE IF NOT EXISTS informacion_financiera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_beneficiario UUID NOT NULL REFERENCES beneficiarios(id) ON DELETE CASCADE,
  ingresos_mensuales_agropecuaria DECIMAL(12, 2),
  ingresos_mensuales_otros DECIMAL(12, 2),
  egresos_mensuales DECIMAL(12, 2),
  activos_totales DECIMAL(15, 2),
  activos_agropecuaria DECIMAL(15, 2),
  pasivos_totales DECIMAL(15, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLA: caracterizaciones (tabla principal que une todo)
-- Tabla principal que relaciona visitas, beneficiarios y predios
CREATE TABLE IF NOT EXISTS caracterizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_visita UUID NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
  id_beneficiario UUID NOT NULL REFERENCES beneficiarios(id) ON DELETE CASCADE,
  id_predio UUID NOT NULL REFERENCES predios(id) ON DELETE CASCADE,
  observaciones TEXT,
  foto_1_url VARCHAR(500),
  foto_2_url VARCHAR(500),
  firma_productor_url VARCHAR(500),
  autorizacion_datos_personales BOOLEAN DEFAULT FALSE,
  autorizacion_consulta_crediticia BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABLA: profiles (usuarios del sistema - asesores)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  nombre_completo VARCHAR(200),
  rol VARCHAR(50) DEFAULT 'asesor' CHECK (rol IN ('admin', 'asesor', 'campesino')),
  telefono VARCHAR(20),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABLA: invitations (invitaciones para nuevos usuarios)
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  rol VARCHAR(50) DEFAULT 'asesor',
  invitado_por UUID REFERENCES auth.users(id),
  usado BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_visitas_fecha ON visitas(fecha_visita);
CREATE INDEX IF NOT EXISTS idx_visitas_asesor ON visitas(asesor_id);
CREATE INDEX IF NOT EXISTS idx_visitas_estado ON visitas(estado);
CREATE INDEX IF NOT EXISTS idx_visitas_radicado_local ON visitas(radicado_local);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_documento ON beneficiarios(numero_documento);
CREATE INDEX IF NOT EXISTS idx_predios_municipio ON predios(municipio);
CREATE INDEX IF NOT EXISTS idx_caracterizaciones_visita ON caracterizaciones(id_visita);

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================

ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE predios ENABLE ROW LEVEL SECURITY;
ALTER TABLE caracterizacion_predio ENABLE ROW LEVEL SECURITY;
ALTER TABLE abastecimiento_agua ENABLE ROW LEVEL SECURITY;
ALTER TABLE riesgos_predio ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_productiva ENABLE ROW LEVEL SECURITY;
ALTER TABLE informacion_financiera ENABLE ROW LEVEL SECURITY;
ALTER TABLE caracterizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Políticas para visitas
CREATE POLICY "visitas_select_own" ON visitas FOR SELECT USING (auth.uid() = asesor_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "visitas_insert_own" ON visitas FOR INSERT WITH CHECK (auth.uid() = asesor_id);
CREATE POLICY "visitas_update_own" ON visitas FOR UPDATE USING (auth.uid() = asesor_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "visitas_delete_admin" ON visitas FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));

-- Políticas para beneficiarios (acceso a través de visitas)
CREATE POLICY "beneficiarios_select" ON beneficiarios FOR SELECT USING (
  EXISTS (SELECT 1 FROM visitas WHERE visitas.id = beneficiarios.id_visita AND (visitas.asesor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')))
);
CREATE POLICY "beneficiarios_insert" ON beneficiarios FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM visitas WHERE visitas.id = id_visita AND visitas.asesor_id = auth.uid())
);
CREATE POLICY "beneficiarios_update" ON beneficiarios FOR UPDATE USING (
  EXISTS (SELECT 1 FROM visitas WHERE visitas.id = beneficiarios.id_visita AND (visitas.asesor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')))
);

-- Políticas para predios
CREATE POLICY "predios_select" ON predios FOR SELECT USING (
  EXISTS (SELECT 1 FROM beneficiarios b JOIN visitas v ON v.id = b.id_visita WHERE b.id = predios.id_beneficiario AND (v.asesor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')))
);
CREATE POLICY "predios_insert" ON predios FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM beneficiarios b JOIN visitas v ON v.id = b.id_visita WHERE b.id = id_beneficiario AND v.asesor_id = auth.uid())
);
CREATE POLICY "predios_update" ON predios FOR UPDATE USING (
  EXISTS (SELECT 1 FROM beneficiarios b JOIN visitas v ON v.id = b.id_visita WHERE b.id = predios.id_beneficiario AND (v.asesor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')))
);

-- Políticas para caracterizacion_predio
CREATE POLICY "caracterizacion_predio_select" ON caracterizacion_predio FOR SELECT USING (
  EXISTS (SELECT 1 FROM predios p JOIN beneficiarios b ON b.id = p.id_beneficiario JOIN visitas v ON v.id = b.id_visita WHERE p.id = caracterizacion_predio.id_predio AND (v.asesor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')))
);
CREATE POLICY "caracterizacion_predio_insert" ON caracterizacion_predio FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM predios p JOIN beneficiarios b ON b.id = p.id_beneficiario JOIN visitas v ON v.id = b.id_visita WHERE p.id = id_predio AND v.asesor_id = auth.uid())
);

-- Políticas para abastecimiento_agua
CREATE POLICY "abastecimiento_agua_select" ON abastecimiento_agua FOR SELECT USING (
  EXISTS (SELECT 1 FROM predios p JOIN beneficiarios b ON b.id = p.id_beneficiario JOIN visitas v ON v.id = b.id_visita WHERE p.id = abastecimiento_agua.id_predio AND (v.asesor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')))
);
CREATE POLICY "abastecimiento_agua_insert" ON abastecimiento_agua FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM predios p JOIN beneficiarios b ON b.id = p.id_beneficiario JOIN visitas v ON v.id = b.id_visita WHERE p.id = id_predio AND v.asesor_id = auth.uid())
);

-- Políticas para riesgos_predio
CREATE POLICY "riesgos_predio_select" ON riesgos_predio FOR SELECT USING (
  EXISTS (SELECT 1 FROM predios p JOIN beneficiarios b ON b.id = p.id_beneficiario JOIN visitas v ON v.id = b.id_visita WHERE p.id = riesgos_predio.id_predio AND (v.asesor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')))
);
CREATE POLICY "riesgos_predio_insert" ON riesgos_predio FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM predios p JOIN beneficiarios b ON b.id = p.id_beneficiario JOIN visitas v ON v.id = b.id_visita WHERE p.id = id_predio AND v.asesor_id = auth.uid())
);

-- Políticas para area_productiva
CREATE POLICY "area_productiva_select" ON area_productiva FOR SELECT USING (
  EXISTS (SELECT 1 FROM predios p JOIN beneficiarios b ON b.id = p.id_beneficiario JOIN visitas v ON v.id = b.id_visita WHERE p.id = area_productiva.id_predio AND (v.asesor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')))
);
CREATE POLICY "area_productiva_insert" ON area_productiva FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM predios p JOIN beneficiarios b ON b.id = p.id_beneficiario JOIN visitas v ON v.id = b.id_visita WHERE p.id = id_predio AND v.asesor_id = auth.uid())
);

-- Políticas para informacion_financiera
CREATE POLICY "informacion_financiera_select" ON informacion_financiera FOR SELECT USING (
  EXISTS (SELECT 1 FROM beneficiarios b JOIN visitas v ON v.id = b.id_visita WHERE b.id = informacion_financiera.id_beneficiario AND (v.asesor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')))
);
CREATE POLICY "informacion_financiera_insert" ON informacion_financiera FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM beneficiarios b JOIN visitas v ON v.id = b.id_visita WHERE b.id = id_beneficiario AND v.asesor_id = auth.uid())
);

-- Políticas para caracterizaciones
CREATE POLICY "caracterizaciones_select" ON caracterizaciones FOR SELECT USING (
  EXISTS (SELECT 1 FROM visitas WHERE visitas.id = caracterizaciones.id_visita AND (visitas.asesor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')))
);
CREATE POLICY "caracterizaciones_insert" ON caracterizaciones FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM visitas WHERE visitas.id = id_visita AND visitas.asesor_id = auth.uid())
);

-- Políticas para profiles
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));

-- Políticas para invitations
CREATE POLICY "invitations_select" ON invitations FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin') OR invitado_por = auth.uid());
CREATE POLICY "invitations_insert" ON invitations FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'asesor')));

-- =============================================================
-- TRIGGER PARA CREAR PERFIL AUTOMÁTICAMENTE
-- =============================================================

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
    COALESCE(NEW.raw_user_meta_data ->> 'nombre_completo', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'rol', 'asesor')
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

-- =============================================================
-- FUNCIÓN PARA GENERAR RADICADO OFICIAL
-- =============================================================

CREATE OR REPLACE FUNCTION generar_radicado_oficial()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  nuevo_radicado TEXT;
  secuencial INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(radicado_oficial FROM 5) AS INTEGER)), 0) + 1
  INTO secuencial
  FROM visitas
  WHERE radicado_oficial IS NOT NULL;
  
  nuevo_radicado := 'RAD-' || LPAD(secuencial::TEXT, 6, '0');
  RETURN nuevo_radicado;
END;
$$;

-- =============================================================
-- STORAGE BUCKETS (ejecutar en Supabase Dashboard > Storage)
-- =============================================================
-- Crear buckets:
-- 1. fotos-beneficiarios (para fotos de productores)
-- 2. firmas (para firmas digitales)
-- 3. documentos (para documentos adjuntos)
