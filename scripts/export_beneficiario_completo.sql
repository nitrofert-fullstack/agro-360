-- =============================================================
-- EXPORT COMPLETO DE BENEFICIARIO - AgroSantander360
-- =============================================================
-- Uso: Reemplaza <NUMERO_DOCUMENTO> por el número real
--      o usa <UUID_BENEFICIARIO> si conoces el ID directamente.
--
-- Cómo exportar a Excel desde Supabase Dashboard:
--   1. Abre SQL Editor en Supabase
--   2. Pega esta query y ejecuta
--   3. Click en "Download CSV" en los resultados de cada sección
--   4. Abre los CSV en Excel → Data > Get Data > From CSV
-- =============================================================

-- ── PARÁMETRO: ajusta este valor ─────────────────────────────
-- Opción A: buscar por número de documento
-- Opción B: buscar por UUID del beneficiario (descomenta la línea que necesites)

-- Opción A (más común): por número de documento
DO $$ BEGIN
  RAISE NOTICE 'Reemplaza <NUMERO_DOCUMENTO> con el número real antes de ejecutar';
END $$;


-- =============================================================
-- SECCIÓN 1: DATOS PERSONALES DEL BENEFICIARIO
-- =============================================================
SELECT
  b.id                                AS beneficiario_id,
  b.nombres,
  b.apellidos,
  b.nombres || ' ' || b.apellidos     AS nombre_completo,
  b.tipo_documento,
  b.numero_documento,
  b.edad,
  b.telefono,
  b.correo,
  b.ocupacion_principal,
  -- Contacto secundario
  b.nombre_contacto_secundario,
  b.telefono_secundario,
  b.parentesco_contacto_secundario,
  -- Foto
  b.foto_url                          AS foto_beneficiario_url,
  b.created_at                        AS fecha_registro,
  b.updated_at                        AS ultima_actualizacion
FROM beneficiarios b
WHERE b.numero_documento = '<NUMERO_DOCUMENTO>'
-- Opción B: WHERE b.id = '<UUID_BENEFICIARIO>'::uuid
ORDER BY b.created_at DESC;


-- =============================================================
-- SECCIÓN 2: VISITAS / CARACTERIZACIONES (tabla principal)
-- =============================================================
SELECT
  c.id                                AS caracterizacion_id,
  -- Visita
  v.id                                AS visita_id,
  v.fecha_visita,
  v.nombre_tecnico                    AS asesor_nombre,
  v.codigo_formulario,
  v.radicado_local,
  v.radicado_oficial,
  v.estado                            AS estado_visita,
  v.version_formulario,
  v.fecha_emision_formulario,
  -- Perfil del asesor
  p.nombre_completo                   AS asesor_nombre_completo,
  p.email                             AS asesor_email,
  p.rol                               AS asesor_rol,
  -- Caracterización
  c.observaciones,
  c.autorizacion_datos_personales,
  c.autorizacion_consulta_crediticia,
  c.firma_productor_url,
  c.foto_1_url,
  c.foto_2_url,
  c.foto_beneficiario_url,
  c.foto_doc_frontal_url,
  c.foto_doc_trasera_url,
  c.created_at                        AS fecha_caracterizacion
FROM caracterizaciones c
JOIN beneficiarios b   ON b.id = c.id_beneficiario
JOIN visitas v         ON v.id = c.id_visita
LEFT JOIN profiles p   ON p.id = v.asesor_id
WHERE b.numero_documento = '<NUMERO_DOCUMENTO>'
ORDER BY v.fecha_visita DESC;


-- =============================================================
-- SECCIÓN 3: PREDIOS
-- =============================================================
SELECT
  pr.id                               AS predio_id,
  b.nombres || ' ' || b.apellidos     AS beneficiario,
  b.numero_documento,
  pr.nombre_predio,
  pr.departamento,
  pr.municipio,
  pr.vereda,
  pr.direccion,
  pr.codigo_catastral,
  pr.tipo_tenencia,
  pr.tipo_tenencia_otro,
  pr.documento_tenencia,
  pr.coordenada_x,
  pr.coordenada_y,
  pr.latitud,
  pr.longitud,
  pr.altitud_msnm,
  pr.vive_en_predio,
  pr.tiene_vivienda,
  pr.area_total_hectareas,
  pr.area_productiva_hectareas,
  pr.cultivos_existentes,
  pr.created_at                       AS fecha_registro_predio
FROM predios pr
JOIN beneficiarios b ON b.id = pr.id_beneficiario
WHERE b.numero_documento = '<NUMERO_DOCUMENTO>'
ORDER BY pr.created_at DESC;


-- =============================================================
-- SECCIÓN 4: CARACTERIZACIÓN DEL PREDIO (clima, acceso, cobertura)
-- =============================================================
SELECT
  pr.nombre_predio,
  pr.municipio,
  pr.vereda,
  cp.ruta_acceso,
  cp.distancia_km,
  cp.tiempo_acceso,
  cp.temperatura_celsius,
  cp.meses_lluvia,
  cp.topografia,
  cp.cobertura_bosque,
  cp.cobertura_cultivos,
  cp.cobertura_pastos,
  cp.cobertura_rastrojo,
  cp.created_at                       AS fecha_registro
FROM caracterizacion_predio cp
JOIN predios pr         ON pr.id = cp.id_predio
JOIN beneficiarios b    ON b.id = pr.id_beneficiario
WHERE b.numero_documento = '<NUMERO_DOCUMENTO>'
ORDER BY pr.nombre_predio;


-- =============================================================
-- SECCIÓN 5: ABASTECIMIENTO DE AGUA
-- =============================================================
SELECT
  pr.nombre_predio,
  pr.municipio,
  pr.vereda,
  aa.nacimiento_manantial,
  aa.rio_quebrada,
  aa.pozo,
  aa.acueducto_rural,
  aa.canal_distrito_riego,
  aa.jaguey_reservorio,
  aa.agua_lluvia,
  aa.otra_fuente,
  -- Resumen texto de fuentes activas
  CONCAT_WS(', ',
    CASE WHEN aa.nacimiento_manantial THEN 'Nacimiento/Manantial' END,
    CASE WHEN aa.rio_quebrada        THEN 'Río/Quebrada' END,
    CASE WHEN aa.pozo                THEN 'Pozo' END,
    CASE WHEN aa.acueducto_rural     THEN 'Acueducto Rural' END,
    CASE WHEN aa.canal_distrito_riego THEN 'Canal/Distrito de Riego' END,
    CASE WHEN aa.jaguey_reservorio   THEN 'Jagüey/Reservorio' END,
    CASE WHEN aa.agua_lluvia         THEN 'Agua Lluvia' END,
    aa.otra_fuente
  )                                   AS fuentes_agua_activas
FROM abastecimiento_agua aa
JOIN predios pr         ON pr.id = aa.id_predio
JOIN beneficiarios b    ON b.id = pr.id_beneficiario
WHERE b.numero_documento = '<NUMERO_DOCUMENTO>'
ORDER BY pr.nombre_predio;


-- =============================================================
-- SECCIÓN 6: RIESGOS DEL PREDIO
-- =============================================================
SELECT
  pr.nombre_predio,
  pr.municipio,
  pr.vereda,
  rp.inundacion,
  rp.sequia,
  rp.viento,
  rp.helada,
  rp.otros_riesgos,
  CONCAT_WS(', ',
    CASE WHEN rp.inundacion THEN 'Inundación' END,
    CASE WHEN rp.sequia     THEN 'Sequía' END,
    CASE WHEN rp.viento     THEN 'Viento' END,
    CASE WHEN rp.helada     THEN 'Helada' END,
    rp.otros_riesgos
  )                                   AS riesgos_activos
FROM riesgos_predio rp
JOIN predios pr         ON pr.id = rp.id_predio
JOIN beneficiarios b    ON b.id = pr.id_beneficiario
WHERE b.numero_documento = '<NUMERO_DOCUMENTO>'
ORDER BY pr.nombre_predio;


-- =============================================================
-- SECCIÓN 7: ÁREA PRODUCTIVA Y COMERCIALIZACIÓN
-- =============================================================
SELECT
  pr.nombre_predio,
  pr.municipio,
  pr.vereda,
  ap.sistema_productivo,
  ap.caracterizacion_cultivo,
  ap.cantidad_produccion,
  ap.estado_cultivo,
  ap.tiene_infraestructura_procesamiento,
  ap.estructuras,
  ap.interesado_programa,
  ap.donde_comercializa,
  ap.ingreso_mensual_ventas,
  ap.created_at                       AS fecha_registro
FROM area_productiva ap
JOIN predios pr         ON pr.id = ap.id_predio
JOIN beneficiarios b    ON b.id = pr.id_beneficiario
WHERE b.numero_documento = '<NUMERO_DOCUMENTO>'
ORDER BY pr.nombre_predio;


-- =============================================================
-- SECCIÓN 8: INFORMACIÓN FINANCIERA
-- =============================================================
SELECT
  b.nombres || ' ' || b.apellidos     AS beneficiario,
  b.numero_documento,
  inf.ingresos_mensuales_agropecuaria,
  inf.ingresos_mensuales_otros,
  COALESCE(inf.ingresos_mensuales_agropecuaria, 0)
    + COALESCE(inf.ingresos_mensuales_otros, 0) AS ingresos_mensuales_total,
  inf.egresos_mensuales,
  COALESCE(inf.ingresos_mensuales_agropecuaria, 0)
    + COALESCE(inf.ingresos_mensuales_otros, 0)
    - COALESCE(inf.egresos_mensuales, 0)        AS balance_mensual,
  inf.activos_totales,
  inf.activos_agropecuaria,
  inf.pasivos_totales,
  COALESCE(inf.activos_totales, 0)
    - COALESCE(inf.pasivos_totales, 0)          AS patrimonio_neto,
  inf.created_at                       AS fecha_registro
FROM informacion_financiera inf
JOIN beneficiarios b ON b.id = inf.id_beneficiario
WHERE b.numero_documento = '<NUMERO_DOCUMENTO>'
ORDER BY inf.created_at DESC;


-- =============================================================
-- SECCIÓN 9: VISTA CONSOLIDADA (todo en una sola fila por predio)
-- Ideal para exportar a Excel como reporte único
-- =============================================================
SELECT
  -- BENEFICIARIO
  b.numero_documento,
  b.tipo_documento,
  b.nombres,
  b.apellidos,
  b.nombres || ' ' || b.apellidos     AS nombre_completo,
  b.edad,
  b.telefono,
  b.correo,
  b.ocupacion_principal,
  b.nombre_contacto_secundario,
  b.telefono_secundario,
  b.parentesco_contacto_secundario,

  -- VISITA
  v.fecha_visita,
  v.nombre_tecnico                    AS asesor_visita,
  v.radicado_local,
  v.radicado_oficial,
  v.estado                            AS estado_visita,
  v.codigo_formulario,

  -- PREDIO
  pr.nombre_predio,
  pr.departamento,
  pr.municipio,
  pr.vereda,
  pr.direccion,
  pr.codigo_catastral,
  pr.tipo_tenencia,
  pr.latitud,
  pr.longitud,
  pr.altitud_msnm,
  pr.vive_en_predio,
  pr.tiene_vivienda,
  pr.area_total_hectareas,
  pr.area_productiva_hectareas,
  pr.cultivos_existentes,

  -- CARACTERIZACIÓN PREDIO
  cp.temperatura_celsius,
  cp.topografia,
  cp.meses_lluvia,
  cp.ruta_acceso,
  cp.distancia_km,
  cp.tiempo_acceso,
  cp.cobertura_bosque,
  cp.cobertura_cultivos,
  cp.cobertura_pastos,
  cp.cobertura_rastrojo,

  -- AGUA (fuentes activas como texto)
  CONCAT_WS(', ',
    CASE WHEN aa.nacimiento_manantial  THEN 'Nacimiento' END,
    CASE WHEN aa.rio_quebrada          THEN 'Río/Quebrada' END,
    CASE WHEN aa.pozo                  THEN 'Pozo' END,
    CASE WHEN aa.acueducto_rural       THEN 'Acueducto' END,
    CASE WHEN aa.canal_distrito_riego  THEN 'Canal Riego' END,
    CASE WHEN aa.jaguey_reservorio     THEN 'Jagüey' END,
    CASE WHEN aa.agua_lluvia           THEN 'Agua Lluvia' END,
    aa.otra_fuente
  )                                   AS fuentes_agua,

  -- RIESGOS (activos como texto)
  CONCAT_WS(', ',
    CASE WHEN rp.inundacion THEN 'Inundación' END,
    CASE WHEN rp.sequia     THEN 'Sequía' END,
    CASE WHEN rp.viento     THEN 'Viento' END,
    CASE WHEN rp.helada     THEN 'Helada' END,
    rp.otros_riesgos
  )                                   AS riesgos,

  -- ÁREA PRODUCTIVA
  ap.sistema_productivo,
  ap.caracterizacion_cultivo,
  ap.cantidad_produccion,
  ap.estado_cultivo,
  ap.tiene_infraestructura_procesamiento,
  ap.estructuras,
  ap.interesado_programa,
  ap.donde_comercializa,
  ap.ingreso_mensual_ventas,

  -- FINANCIERO
  inf.ingresos_mensuales_agropecuaria,
  inf.ingresos_mensuales_otros,
  COALESCE(inf.ingresos_mensuales_agropecuaria, 0)
    + COALESCE(inf.ingresos_mensuales_otros, 0)  AS ingresos_totales,
  inf.egresos_mensuales,
  inf.activos_totales,
  inf.activos_agropecuaria,
  inf.pasivos_totales,

  -- CARACTERIZACIÓN (autorizaciones y docs)
  c.autorizacion_datos_personales,
  c.autorizacion_consulta_crediticia,
  c.observaciones,

  -- FECHAS
  c.created_at                        AS fecha_registro_sistema

FROM beneficiarios b
-- Caracterización como eje central
JOIN caracterizaciones c    ON c.id_beneficiario = b.id
JOIN visitas v              ON v.id = c.id_visita
JOIN predios pr             ON pr.id = c.id_predio
-- Sub-tablas del predio (LEFT JOIN porque pueden no existir)
LEFT JOIN caracterizacion_predio cp ON cp.id_predio = pr.id
LEFT JOIN abastecimiento_agua aa    ON aa.id_predio  = pr.id
LEFT JOIN riesgos_predio rp         ON rp.id_predio  = pr.id
LEFT JOIN area_productiva ap        ON ap.id_predio  = pr.id
-- Financiero del beneficiario
LEFT JOIN informacion_financiera inf ON inf.id_beneficiario = b.id

WHERE b.numero_documento = '<NUMERO_DOCUMENTO>'
ORDER BY v.fecha_visita DESC, pr.nombre_predio;


-- =============================================================
-- BÚSQUEDA MASIVA: todos los beneficiarios (quita el WHERE)
-- Útil para exportar toda la base de datos a Excel
-- =============================================================
-- Descomenta la siguiente query y comenta el WHERE de arriba:
/*
SELECT ... (mismo SELECT de Sección 9 sin WHERE)
ORDER BY b.apellidos, b.nombres, v.fecha_visita DESC;
*/
