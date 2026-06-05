-- Previene caracterizaciones duplicadas a nivel de base de datos.
-- Un beneficiario solo puede tener UNA caracterización en estado activo/bloqueante.
-- Estados finales (APROBADO, CANCELADO) no cuentan: permiten iniciar un proceso nuevo.
-- Requiere BD sin duplicados activos (limpieza ejecutada 2026-06-05 con scripts/limpiar-duplicados.mjs).
CREATE UNIQUE INDEX IF NOT EXISTS uq_caracterizacion_activa_por_beneficiario
ON caracterizaciones (id_beneficiario)
WHERE estado IN ('INICIADO', 'REVISADO', 'EN_ESTUDIO_CREDITO', 'SINCRONIZADO', 'EN_REVISION', 'RECHAZADO');

-- Idempotencia de sync offline: el localId del cliente se guarda en visitas.codigo_formulario.
-- Índice único parcial para que reintentos con el mismo X-Sync-Id se detecten rápido y
-- no puedan insertarse dos veces ni en condición de carrera.
CREATE UNIQUE INDEX IF NOT EXISTS uq_visitas_codigo_formulario
ON visitas (codigo_formulario)
WHERE codigo_formulario IS NOT NULL;
