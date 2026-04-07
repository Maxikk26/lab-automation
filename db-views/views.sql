-- ============================================
-- Metabase Views -- Laboratorio InmunoXXI
-- Esquema: tiempos_entrega
-- Fuente unica de vistas. Aplicadas por el backend
-- al arrancar: editar aqui + restart backend.
-- ============================================
-- Convenciones de nombres:
--   Fases: procesamiento_dias | validacion_dias | proc_y_validacion_dias | impresion_dias | total_dias
--   Meta:  COALESCE(metas_periodo, tiempos_seccion.meta_dias, metas_seccion)
--   Exclusiones: LEFT JOIN examenes_excluidos + WHERE ee.id IS NULL
--   Tolerancias: LEFT JOIN config_tolerancias (periodo) + config_tolerancias (default)
-- ============================================

SET search_path TO tiempos_entrega, public;

-- Eliminar todas las vistas para poder recrearlas con columnas actualizadas
DROP VIEW IF EXISTS v_resumen_global;
DROP VIEW IF EXISTS v_reporte_mensual;
DROP VIEW IF EXISTS v_tendencia_anual;
DROP VIEW IF EXISTS v_examenes_seccion;
DROP VIEW IF EXISTS v_promedio_acumulado;
DROP VIEW IF EXISTS v_examenes_cumplimiento;
DROP VIEW IF EXISTS v_fases_seccion;
DROP VIEW IF EXISTS v_portafolio_seccion;

-- ── Vista 1: Examenes x Seccion (prioridad #1) ────────────────────────────────
-- Una fila por examen/mes. Semaforo basado en umbrales absolutos de dias
-- parametrizables desde config_tolerancias.
-- Excluye sub-componentes via examenes_excluidos.
CREATE OR REPLACE VIEW v_examenes_cumplimiento AS
SELECT
    CAST(p.anio AS VARCHAR)                  AS anio,
    p.mes,
    te.seccion_padre                         AS seccion,
    COALESCE(ms.tipo, 'INMUNOXXI')           AS tipo,
    te.examen,
    te.total_examenes,
    te.ingreso_impresion_dias                AS total_dias,
    COALESCE(mp.meta_dias, ms.meta_dias, 0)  AS meta_dias,
    -- % del tiempo meta utilizado: 100% = exactamente en meta, >100% = fuera de meta
    CASE
        WHEN te.ingreso_impresion_dias IS NULL THEN NULL
        WHEN COALESCE(mp.meta_dias, ms.meta_dias) IS NULL
             OR COALESCE(mp.meta_dias, ms.meta_dias) = 0 THEN NULL
        ELSE ROUND(
            te.ingreso_impresion_dias / NULLIF(COALESCE(mp.meta_dias, ms.meta_dias), 0) * 100,
            2
        )
    END AS pct_meta_utilizado,
    -- Semaforo: CUMPLE / ALERTA / CRITICO segun umbrales absolutos en dias
    CASE
        WHEN te.ingreso_impresion_dias IS NULL
             THEN 'SIN DATOS'
        WHEN te.ingreso_impresion_dias <= COALESCE(ct.umbral_dias_cumple,  ct_def.umbral_dias_cumple,  10)
             THEN 'CUMPLE'
        WHEN te.ingreso_impresion_dias <= COALESCE(ct.umbral_dias_alerta,  ct_def.umbral_dias_alerta,  15)
             THEN 'ALERTA'
        ELSE 'CRITICO'
    END AS estado
FROM tiempos_examen te
JOIN periodos p ON p.id = te.periodo_id
LEFT JOIN metas_seccion ms ON UPPER(TRIM(ms.seccion)) = UPPER(TRIM(te.seccion_padre))
LEFT JOIN metas_periodo mp
    ON UPPER(TRIM(mp.seccion)) = UPPER(TRIM(te.seccion_padre))
    AND mp.anio = p.anio AND mp.mes = p.mes
LEFT JOIN examenes_excluidos ee
    ON UPPER(TRIM(ee.seccion)) = UPPER(TRIM(te.seccion_padre))
    AND TRIM(SPLIT_PART(te.examen, '-', 1)) = ee.codigo_examen
LEFT JOIN config_tolerancias ct
    ON ct.anio = p.anio AND ct.mes = p.mes
LEFT JOIN config_tolerancias ct_def
    ON ct_def.anio IS NULL AND ct_def.mes IS NULL
WHERE te.seccion_padre IS NOT NULL
  AND ee.id IS NULL
ORDER BY p.anio, p.mes, te.seccion_padre, te.examen;

-- ── Vista 2: Fases x Seccion ──────────────────────────────────────────────────
-- Una fila por seccion/mes. Desglose de fases, total_dias vs meta y cuello
-- de botella. El dato de mayor interes es total_dias vs meta_dias.
CREATE OR REPLACE VIEW v_fases_seccion AS
SELECT
    CAST(p.anio AS VARCHAR)                  AS anio,
    p.mes,
    ts.seccion,
    COALESCE(ms.tipo, 'INMUNOXXI')           AS tipo,
    ts.total_examenes,
    -- Fases en dias
    ts.ingreso_resultado_dias                AS procesamiento_dias,
    ts.resultado_validacion_dias             AS validacion_dias,
    ts.ingreso_validacion_dias               AS proc_y_validacion_dias,
    ts.validacion_impresion_dias             AS impresion_dias,
    ts.ingreso_impresion_dias                AS total_dias,
    -- Meta y cumplimiento
    COALESCE(mp.meta_dias, ts.meta_dias, ms.meta_dias) AS meta_dias,
    CASE
        WHEN COALESCE(mp.meta_dias, ts.meta_dias, ms.meta_dias) IS NOT NULL
             AND COALESCE(mp.meta_dias, ts.meta_dias, ms.meta_dias) > 0
             AND ts.ingreso_impresion_dias IS NOT NULL
             AND ts.ingreso_impresion_dias > 0
        THEN ROUND(COALESCE(mp.meta_dias, ts.meta_dias, ms.meta_dias) / ts.ingreso_impresion_dias, 4)
        ELSE NULL
    END AS eficacia,
    CASE
        WHEN COALESCE(mp.meta_dias, ts.meta_dias, ms.meta_dias) IS NULL
             OR COALESCE(mp.meta_dias, ts.meta_dias, ms.meta_dias) = 0 THEN 'SIN META'
        WHEN ts.ingreso_impresion_dias IS NULL
             OR ts.ingreso_impresion_dias = 0                           THEN 'SIN DATOS'
        WHEN COALESCE(mp.meta_dias, ts.meta_dias, ms.meta_dias) / ts.ingreso_impresion_dias >= 1.0  THEN 'CUMPLE'
        WHEN COALESCE(mp.meta_dias, ts.meta_dias, ms.meta_dias) / ts.ingreso_impresion_dias >= 0.75 THEN 'ALERTA'
        ELSE 'NO CUMPLE'
    END AS estado,
    -- Peso de cada fase sobre total_dias
    CASE WHEN ts.ingreso_impresion_dias > 0
        THEN ROUND(ts.ingreso_resultado_dias    / ts.ingreso_impresion_dias, 4) ELSE NULL
    END AS pct_procesamiento,
    CASE WHEN ts.ingreso_impresion_dias > 0
        THEN ROUND(ts.resultado_validacion_dias / ts.ingreso_impresion_dias, 4) ELSE NULL
    END AS pct_validacion,
    CASE WHEN ts.ingreso_impresion_dias > 0
        THEN ROUND(ts.validacion_impresion_dias / ts.ingreso_impresion_dias, 4) ELSE NULL
    END AS pct_impresion,
    -- Cuello de botella: la fase mas lenta
    (
        SELECT fase
        FROM (VALUES
            ('PROCESAMIENTO', COALESCE(ts.ingreso_resultado_dias,    0)),
            ('VALIDACION',    COALESCE(ts.resultado_validacion_dias, 0)),
            ('IMPRESION',     COALESCE(ts.validacion_impresion_dias, 0))
        ) AS t(fase, val)
        WHERE val > 0
        ORDER BY val DESC
        LIMIT 1
    ) AS cuello_botella
FROM tiempos_seccion ts
JOIN periodos p ON p.id = ts.periodo_id
LEFT JOIN metas_seccion ms ON UPPER(TRIM(ms.seccion)) = UPPER(TRIM(ts.seccion))
LEFT JOIN metas_periodo mp
    ON UPPER(TRIM(mp.seccion)) = UPPER(TRIM(ts.seccion))
    AND mp.anio = p.anio AND mp.mes = p.mes
ORDER BY p.anio, p.mes, ts.seccion;

-- ── Vista 3: Portafolio x Seccion ─────────────────────────────────────────────
-- Agrega examenes por seccion/mes: cuantos superan la meta y semaforo.
-- Tolerancias parametrizables desde config_tolerancias.
-- 3 niveles: EN RANGO / ALERTA / CRITICO.
-- Excluye sub-componentes via examenes_excluidos.
CREATE OR REPLACE VIEW v_portafolio_seccion AS
SELECT
    sub.anio,
    sub.mes,
    sub.seccion,
    sub.tipo,
    sub.meta_dias,
    sub.total_pruebas,
    sub.pruebas_fuera_meta,
    sub.pct_fuera_meta,
    CASE
        WHEN sub.pct_fuera_meta <= sub.umbral_en_rango THEN 'EN RANGO'
        WHEN sub.pct_fuera_meta <= sub.umbral_alerta   THEN 'ALERTA'
        ELSE 'CRITICO'
    END AS estado
FROM (
    SELECT
        CAST(p.anio AS VARCHAR)                  AS anio,
        p.mes,
        te.seccion_padre                                      AS seccion,
        COALESCE(ms.tipo, 'INMUNOXXI')                        AS tipo,
        COALESCE(mp.meta_dias, ms.meta_dias, 0)               AS meta_dias,
        COUNT(*)                                              AS total_pruebas,
        COUNT(*) FILTER (
            WHERE te.ingreso_impresion_dias IS NOT NULL
              AND COALESCE(mp.meta_dias, ms.meta_dias) IS NOT NULL
              AND te.ingreso_impresion_dias > COALESCE(mp.meta_dias, ms.meta_dias)
        )                                                     AS pruebas_fuera_meta,
        ROUND(
            COUNT(*) FILTER (
                WHERE te.ingreso_impresion_dias IS NOT NULL
                  AND COALESCE(mp.meta_dias, ms.meta_dias) IS NOT NULL
                  AND te.ingreso_impresion_dias > COALESCE(mp.meta_dias, ms.meta_dias)
            )::numeric / NULLIF(COUNT(*), 0),
            4
        )                                                     AS pct_fuera_meta,
        COALESCE(ct.umbral_en_rango,  ct_def.umbral_en_rango,  0.10) AS umbral_en_rango,
        COALESCE(ct.umbral_alerta,    ct_def.umbral_alerta,    0.15) AS umbral_alerta,
        COALESCE(ct.umbral_critico,   ct_def.umbral_critico,   0.20) AS umbral_critico
    FROM tiempos_examen te
    JOIN periodos p ON p.id = te.periodo_id
    LEFT JOIN metas_seccion ms ON UPPER(TRIM(ms.seccion)) = UPPER(TRIM(te.seccion_padre))
    LEFT JOIN metas_periodo mp
        ON UPPER(TRIM(mp.seccion)) = UPPER(TRIM(te.seccion_padre))
        AND mp.anio = p.anio AND mp.mes = p.mes
    LEFT JOIN examenes_excluidos ee
        ON UPPER(TRIM(ee.seccion)) = UPPER(TRIM(te.seccion_padre))
        AND TRIM(SPLIT_PART(te.examen, '-', 1)) = ee.codigo_examen
    LEFT JOIN config_tolerancias ct
        ON ct.anio = p.anio AND ct.mes = p.mes
    LEFT JOIN config_tolerancias ct_def
        ON ct_def.anio IS NULL AND ct_def.mes IS NULL
    WHERE te.seccion_padre IS NOT NULL
      AND ee.id IS NULL
    GROUP BY p.anio, p.mes, te.seccion_padre, ms.tipo, ms.meta_dias, mp.meta_dias,
             ct.umbral_en_rango, ct.umbral_alerta, ct.umbral_critico,
             ct_def.umbral_en_rango, ct_def.umbral_alerta, ct_def.umbral_critico
) sub
ORDER BY sub.anio, sub.mes, sub.seccion;
