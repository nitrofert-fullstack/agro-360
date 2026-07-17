-- =============================================================
-- ANALÍTICA DE NEGOCIO - AgroSantander360
-- Datos para toma de decisiones estratégicas
-- =============================================================

SELECT
  -- SEGMENTACIÓN GEOGRÁFICA
  pr.municipio,
  pr.vereda,

  -- ESTADO DEL PROCESO
  c.estado,
  v.fecha_visita,
  DATE_PART('year', v.fecha_visita)    AS anio,
  DATE_PART('month', v.fecha_visita)   AS mes,
  p.nombre_completo                    AS asesor,

  -- PERFIL DEL PRODUCTOR
  b.edad,
  b.genero,
  b.personas_a_cargo,
  b.ocupacion_principal,
  b.asociacion,

  -- PREDIO Y TENENCIA
  pr.tipo_tenencia,
  pr.area_total_hectareas,
  pr.area_productiva_hectareas,
  ROUND(
    CASE
      WHEN pr.area_total_hectareas > 0
      THEN (pr.area_productiva_hectareas / pr.area_total_hectareas) * 100
    END, 1
  )                                    AS pct_area_productiva,
  cp.topografia,
  pr.altitud_msnm,
  cp.temperatura_celsius,

  -- SISTEMA PRODUCTIVO
  ap.sistema_productivo,
  pr.cultivos_existentes,
  ap.estado_cultivo,
  ap.cantidad_produccion,
  ap.donde_comercializa,
  ap.interesado_programa,
  ap.tiene_infraestructura_procesamiento,
  ap.sistema_productivo_interes,
  ap.hectareas_siembra_nueva,
  ap.hectareas_renovacion,

  -- AGUA Y RIESGOS (para priorización de intervenciones)
  CASE WHEN aa.acueducto_rural OR aa.canal_distrito_riego
       THEN 'Sistema formal' ELSE 'Fuente natural/propia' END AS tipo_agua,
  CASE
    WHEN rp.inundacion AND rp.sequia THEN 'Alto'
    WHEN rp.inundacion OR rp.sequia OR rp.helada THEN 'Medio'
    WHEN rp.viento THEN 'Bajo'
    ELSE 'Sin riesgo registrado'
  END                                  AS nivel_riesgo,

  -- INGRESOS Y VIABILIDAD FINANCIERA
  inf.ingresos_mensuales_agropecuaria,
  inf.ingresos_mensuales_otros,
  COALESCE(inf.ingresos_mensuales_agropecuaria, 0)
    + COALESCE(inf.ingresos_mensuales_otros, 0)    AS ingreso_total_mensual,
  ap.ingreso_mensual_ventas,
  inf.egresos_mensuales,
  COALESCE(inf.ingresos_mensuales_agropecuaria, 0)
    + COALESCE(inf.ingresos_mensuales_otros, 0)
    - COALESCE(inf.egresos_mensuales, 0)           AS balance_mensual,
  inf.activos_totales,
  inf.pasivos_totales,
  CASE
    WHEN COALESCE(inf.activos_totales, 0) > 0
    THEN ROUND((COALESCE(inf.pasivos_totales, 0) / inf.activos_totales) * 100, 1)
  END                                  AS pct_endeudamiento,

  -- SEGMENTACIÓN DE TAMAÑO DE PREDIO (para focalización)
  CASE
    WHEN pr.area_total_hectareas < 1    THEN 'Microfundio (<1 ha)'
    WHEN pr.area_total_hectareas < 5    THEN 'Minifundio (1-5 ha)'
    WHEN pr.area_total_hectareas < 20   THEN 'Pequeña (5-20 ha)'
    WHEN pr.area_total_hectareas < 50   THEN 'Mediana (20-50 ha)'
    ELSE                                     'Grande (>50 ha)'
  END                                  AS clasificacion_predio,

  -- SEGMENTACIÓN DE INGRESO (para priorización crediticia)
  CASE
    WHEN COALESCE(inf.ingresos_mensuales_agropecuaria, 0)
       + COALESCE(inf.ingresos_mensuales_otros, 0) = 0        THEN 'Sin reporte'
    WHEN COALESCE(inf.ingresos_mensuales_agropecuaria, 0)
       + COALESCE(inf.ingresos_mensuales_otros, 0) < 500000   THEN 'Bajo (<500k)'
    WHEN COALESCE(inf.ingresos_mensuales_agropecuaria, 0)
       + COALESCE(inf.ingresos_mensuales_otros, 0) < 1500000  THEN 'Medio (500k-1.5M)'
    WHEN COALESCE(inf.ingresos_mensuales_agropecuaria, 0)
       + COALESCE(inf.ingresos_mensuales_otros, 0) < 4000000  THEN 'Alto (1.5M-4M)'
    ELSE                                                            'Muy alto (>4M)'
  END                                  AS segmento_ingreso,

  -- AUTORIZACIONES (tasa de conversión crediticia)
  c.autorizacion_datos_personales,
  c.autorizacion_consulta_crediticia,

  -- POTENCIAL DE EXPANSIÓN
  CASE
    WHEN ap.interesado_programa = true
     AND (ap.hectareas_siembra_nueva > 0 OR ap.hectareas_renovacion > 0)
    THEN 'Alto'
    WHEN ap.interesado_programa = true
    THEN 'Medio'
    ELSE 'Bajo/No reportado'
  END                                  AS potencial_expansion

FROM caracterizaciones c
JOIN beneficiarios b              ON b.id  = c.id_beneficiario
JOIN visitas v                    ON v.id  = c.id_visita
JOIN predios pr                   ON pr.id = c.id_predio
LEFT JOIN profiles p              ON p.id  = v.asesor_id::uuid
LEFT JOIN caracterizacion_predio cp  ON cp.id_predio = pr.id
LEFT JOIN abastecimiento_agua aa     ON aa.id_predio  = pr.id
LEFT JOIN riesgos_predio rp          ON rp.id_predio  = pr.id
LEFT JOIN area_productiva ap         ON ap.id_predio  = pr.id
LEFT JOIN informacion_financiera inf ON inf.id_beneficiario = b.id

ORDER BY pr.municipio, c.estado, ingreso_total_mensual DESC;
