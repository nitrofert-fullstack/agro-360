-- =============================================================
-- EXPORT COMPLETO BASE DE DATOS - AgroSantander360
-- Una fila por predio, con TODA la información relacionada
-- Basado en schema Prisma verificado
-- =============================================================
--
-- Cómo exportar a Excel desde Supabase:
--   1. Abre Supabase Dashboard → SQL Editor
--   2. Pega esta query y ejecuta
--   3. Click en "Download CSV"
--   4. Abre el CSV en Excel: Datos → Desde texto/CSV
--
-- Filtros opcionales (añadir antes del ORDER BY):
--   WHERE b.numero_documento = '123456789'
--   WHERE pr.municipio = 'El Peñón'
--   WHERE c.estado = 'APROBADO'
--   WHERE v.fecha_visita BETWEEN '2026-01-01' AND '2026-12-31'
--   WHERE p.nombre_completo ILIKE '%nombre_asesor%'
-- =============================================================

SELECT
  -- ── IDENTIFICACIÓN ───────────────────────────────────────
  c.id                                          AS caracterizacion_id,
  v.radicado_local,
  v.radicado_oficial,
  c.estado                                      AS estado_visita,
  v.fecha_visita,
  v.version_formulario,
  v.fecha_emision_formulario,
  v.codigo_formulario,

  -- ── ASESOR ───────────────────────────────────────────────
  p.nombre_completo                             AS asesor_nombre,
  p.email                                       AS asesor_email,
  p.rol                                         AS asesor_rol,
  p.telefono                                    AS asesor_telefono,
  v.nombre_tecnico                              AS nombre_tecnico_formulario,

  -- ── BENEFICIARIO ─────────────────────────────────────────
  b.nombres,
  b.apellidos,
  b.nombres || ' ' || b.apellidos               AS nombre_completo,
  b.tipo_documento,
  b.numero_documento,
  b.edad,
  b.fecha_nacimiento,
  b.genero,
  b.personas_a_cargo,
  b.telefono,
  b.correo,
  b.ocupacion_principal,
  b.asociacion,

  -- ── CONTACTO SECUNDARIO ───────────────────────────────────
  b.nombre_contacto_secundario,
  b.telefono_secundario,
  b.parentesco_contacto_secundario,

  -- ── PREDIO - UBICACIÓN ───────────────────────────────────
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

  -- ── CARACTERIZACIÓN DEL PREDIO ───────────────────────────
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

  -- ── AGUA (booleanos individuales) ─────────────────────────
  aa.nacimiento_manantial               AS agua_nacimiento,
  aa.rio_quebrada                       AS agua_rio_quebrada,
  aa.pozo                               AS agua_pozo,
  aa.acueducto_rural                    AS agua_acueducto,
  aa.canal_distrito_riego               AS agua_canal_riego,
  aa.jaguey_reservorio                  AS agua_jaguey,
  aa.agua_lluvia                        AS agua_lluvia,
  aa.otra_fuente                        AS agua_otra_fuente,
  NULLIF(CONCAT_WS(', ',
    CASE WHEN aa.nacimiento_manantial  THEN 'Nacimiento' END,
    CASE WHEN aa.rio_quebrada          THEN 'Río/Quebrada' END,
    CASE WHEN aa.pozo                  THEN 'Pozo' END,
    CASE WHEN aa.acueducto_rural       THEN 'Acueducto' END,
    CASE WHEN aa.canal_distrito_riego  THEN 'Canal Riego' END,
    CASE WHEN aa.jaguey_reservorio     THEN 'Jagüey' END,
    CASE WHEN aa.agua_lluvia           THEN 'Agua Lluvia' END,
    aa.otra_fuente
  ), '')                                AS fuentes_agua_resumen,

  -- ── RIESGOS ───────────────────────────────────────────────
  rp.inundacion                         AS riesgo_inundacion,
  rp.sequia                             AS riesgo_sequia,
  rp.viento                             AS riesgo_viento,
  rp.helada                             AS riesgo_helada,
  rp.otros_riesgos,
  NULLIF(CONCAT_WS(', ',
    CASE WHEN rp.inundacion THEN 'Inundación' END,
    CASE WHEN rp.sequia     THEN 'Sequía' END,
    CASE WHEN rp.viento     THEN 'Viento' END,
    CASE WHEN rp.helada     THEN 'Helada' END,
    rp.otros_riesgos
  ), '')                                AS riesgos_resumen,

  -- ── ÁREA PRODUCTIVA ──────────────────────────────────────
  ap.sistema_productivo,
  ap.sistema_productivo_interes,
  ap.caracterizacion_cultivo,
  ap.cantidad_produccion,
  ap.estado_cultivo,
  ap.hectareas_siembra_nueva,
  ap.hectareas_renovacion,
  ap.tiene_infraestructura_procesamiento,
  ap.estructuras,
  ap.interesado_programa,
  ap.donde_comercializa,
  ap.ingreso_mensual_ventas,

  -- ── FINANCIERO ────────────────────────────────────────────
  inf.ingresos_mensuales_agropecuaria,
  inf.ingresos_mensuales_otros,
  COALESCE(inf.ingresos_mensuales_agropecuaria, 0)
    + COALESCE(inf.ingresos_mensuales_otros, 0)   AS ingresos_mensuales_total,
  inf.egresos_mensuales,
  COALESCE(inf.ingresos_mensuales_agropecuaria, 0)
    + COALESCE(inf.ingresos_mensuales_otros, 0)
    - COALESCE(inf.egresos_mensuales, 0)           AS balance_mensual,
  inf.activos_totales,
  inf.activos_agropecuaria,
  inf.pasivos_totales,
  COALESCE(inf.activos_totales, 0)
    - COALESCE(inf.pasivos_totales, 0)             AS patrimonio_neto,

  -- ── AUTORIZACIONES ───────────────────────────────────────
  c.autorizacion_datos_personales,
  c.autorizacion_consulta_crediticia,
  c.autorizacion_aviso_privacidad,
  c.autorizacion_uso_imagen,
  c.observaciones,

  -- ── FOTOS (URLs) ─────────────────────────────────────────
  c.foto_beneficiario_url,
  c.foto_1_url                          AS foto_predio_1,
  c.foto_2_url                          AS foto_predio_2,
  c.firma_productor_url,
  c.foto_doc_frontal_url,
  c.foto_doc_trasera_url,

  -- ── FECHAS ───────────────────────────────────────────────
  c.created_at                          AS fecha_registro_sistema,
  c.updated_at                          AS fecha_ultima_actualizacion,
  v.created_at                          AS fecha_creacion_visita

FROM caracterizaciones c
JOIN beneficiarios b          ON b.id  = c.id_beneficiario
JOIN visitas v                ON v.id  = c.id_visita
JOIN predios pr               ON pr.id = c.id_predio
LEFT JOIN profiles p          ON p.id  = v.asesor_id::uuid
LEFT JOIN caracterizacion_predio cp  ON cp.id_predio = pr.id
LEFT JOIN abastecimiento_agua aa     ON aa.id_predio  = pr.id
LEFT JOIN riesgos_predio rp          ON rp.id_predio  = pr.id
LEFT JOIN area_productiva ap         ON ap.id_predio  = pr.id
LEFT JOIN informacion_financiera inf ON inf.id_beneficiario = b.id

ORDER BY
  b.apellidos  ASC,
  b.nombres    ASC,
  v.fecha_visita DESC;
