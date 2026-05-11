-- =============================================================
-- REPORTE RELEVANTE - AgroSantander360
-- Información clave de cada caracterización para análisis
-- =============================================================

SELECT
  -- IDENTIFICACIÓN
  v.radicado_oficial,
  v.radicado_local,
  c.estado,
  v.fecha_visita,

  -- ASESOR
  p.nombre_completo                                         AS asesor,

  -- BENEFICIARIO
  b.nombres || ' ' || b.apellidos                           AS productor,
  b.tipo_documento,
  b.numero_documento,
  b.edad,
  b.genero,
  b.personas_a_cargo,
  b.telefono,
  b.correo,
  b.ocupacion_principal,

  -- UBICACIÓN
  pr.municipio,
  pr.vereda,
  pr.nombre_predio,
  pr.tipo_tenencia,
  pr.area_total_hectareas                                   AS area_total_ha,
  pr.area_productiva_hectareas                              AS area_productiva_ha,

  -- PREDIO
  cp.temperatura_celsius                                    AS temperatura,
  cp.topografia,
  pr.altitud_msnm,
  pr.vive_en_predio,

  -- AGUA (resumen)
  NULLIF(CONCAT_WS(', ',
    CASE WHEN aa.nacimiento_manantial THEN 'Nacimiento'   END,
    CASE WHEN aa.rio_quebrada         THEN 'Río/Quebrada' END,
    CASE WHEN aa.pozo                 THEN 'Pozo'         END,
    CASE WHEN aa.acueducto_rural      THEN 'Acueducto'    END,
    CASE WHEN aa.canal_distrito_riego THEN 'Canal Riego'  END,
    CASE WHEN aa.jaguey_reservorio    THEN 'Jagüey'       END,
    CASE WHEN aa.agua_lluvia          THEN 'Agua Lluvia'  END,
    aa.otra_fuente
  ), '')                                                    AS fuentes_agua,

  -- RIESGOS (resumen)
  NULLIF(CONCAT_WS(', ',
    CASE WHEN rp.inundacion THEN 'Inundación' END,
    CASE WHEN rp.sequia     THEN 'Sequía'     END,
    CASE WHEN rp.viento     THEN 'Viento'     END,
    CASE WHEN rp.helada     THEN 'Helada'     END,
    rp.otros_riesgos
  ), '')                                                    AS riesgos,

  -- PRODUCCIÓN
  ap.sistema_productivo,
  pr.cultivos_existentes,
  ap.caracterizacion_cultivo,
  ap.cantidad_produccion,
  ap.estado_cultivo,
  ap.donde_comercializa,
  ap.ingreso_mensual_ventas                                 AS ingreso_venta_mensual,
  ap.interesado_programa,

  -- FINANCIERO
  inf.ingresos_mensuales_agropecuaria                       AS ingreso_agropecuario,
  inf.ingresos_mensuales_otros                              AS ingreso_otros,
  COALESCE(inf.ingresos_mensuales_agropecuaria, 0)
    + COALESCE(inf.ingresos_mensuales_otros, 0)             AS ingreso_total,
  inf.egresos_mensuales,
  inf.activos_totales,
  inf.pasivos_totales

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

ORDER BY pr.municipio, b.apellidos, b.nombres;
