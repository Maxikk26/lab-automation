-- ============================================
-- Metabase Views -- Laboratorio InmunoXXI
-- Esquema: tiempos_entrega
-- Fuente unica de vistas. Aplicadas por el backend
-- al arrancar: editar aqui + restart backend.
-- ============================================

SET search_path TO tiempos_entrega, public;

-- ── Vista 1: Reporte mensual con eficacia ─────────────────────────────────────
CREATE OR REPLACE VIEW v_reporte_mensual AS
SELECT
    p.anio,
    p.mes,
    p.fecha_inicio,
    p.fecha_fin,
    ts.seccion,
    COALESCE(ms.tipo, 'INMUNOXXI') AS tipo,
    ts.total_examenes,
    ts.ingreso_resultado_dias,
    ts.resultado_validacion_dias,
    ts.ingreso_validacion_dias,
    ts.validacion_impresion_dias,
    ts.ingreso_impresion_dias,
    COALESCE(ts.meta_dias, ms.meta_dias) AS meta_dias,
    CASE
        WHEN COALESCE(ts.meta_dias, ms.meta_dias) IS NOT NULL
             AND COALESCE(ts.meta_dias, ms.meta_dias) > 0
             AND ts.ingreso_impresion_dias IS NOT NULL
             AND ts.ingreso_impresion_dias > 0
        THEN ROUND(COALESCE(ts.meta_dias, ms.meta_dias) / ts.ingreso_impresion_dias, 4)
        ELSE NULL
    END AS eficacia,
    CASE
        WHEN COALESCE(ts.meta_dias, ms.meta_dias) IS NULL
             OR COALESCE(ts.meta_dias, ms.meta_dias) = 0 THEN 'SIN META'
        WHEN ts.ingreso_impresion_dias IS NULL
             OR ts.ingreso_impresion_dias = 0              THEN 'SIN DATOS'
        WHEN COALESCE(ts.meta_dias, ms.meta_dias) / ts.ingreso_impresion_dias >= 1.0  THEN 'CUMPLE'
        WHEN COALESCE(ts.meta_dias, ms.meta_dias) / ts.ingreso_impresion_dias >= 0.75 THEN 'ALERTA'
        ELSE 'NO CUMPLE'
    END AS estado_eficacia
FROM tiempos_seccion ts
JOIN periodos p ON p.id = ts.periodo_id
LEFT JOIN metas_seccion ms ON UPPER(TRIM(ms.seccion)) = UPPER(TRIM(ts.seccion))
ORDER BY p.anio, p.fecha_inicio, ts.seccion;

-- ── Vista 2: Tendencia anual ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_tendencia_anual AS
SELECT
    p.anio,
    p.mes,
    p.fecha_inicio,
    ts.seccion,
    COALESCE(ms.tipo, 'INMUNOXXI') AS tipo,
    ts.ingreso_impresion_dias AS dias_entrega,
    COALESCE(ts.meta_dias, ms.meta_dias) AS meta_dias,
    CASE
        WHEN COALESCE(ts.meta_dias, ms.meta_dias) IS NOT NULL
             AND COALESCE(ts.meta_dias, ms.meta_dias) > 0
             AND ts.ingreso_impresion_dias IS NOT NULL
             AND ts.ingreso_impresion_dias > 0
        THEN ROUND(COALESCE(ts.meta_dias, ms.meta_dias) / ts.ingreso_impresion_dias, 4)
        ELSE NULL
    END AS eficacia
FROM tiempos_seccion ts
JOIN periodos p ON p.id = ts.periodo_id
LEFT JOIN metas_seccion ms ON UPPER(TRIM(ms.seccion)) = UPPER(TRIM(ts.seccion))
ORDER BY p.anio, p.fecha_inicio, ts.seccion;

-- ── Vista 3: Detalle por examen ───────────────────────────────────────────────
CREATE OR REPLACE VIEW v_examenes_seccion AS
SELECT
    p.anio,
    p.mes,
    p.fecha_inicio,
    p.fecha_fin,
    te.seccion_padre,
    COALESCE(ms.tipo, 'INMUNOXXI') AS tipo,
    te.examen,
    te.total_examenes,
    te.ingreso_resultado_horas,
    te.resultado_validacion_horas,
    te.ingreso_validacion_horas,
    te.validacion_impresion_horas,
    te.ingreso_impresion_horas,
    te.ingreso_resultado_dias,
    te.resultado_validacion_dias,
    te.ingreso_validacion_dias,
    te.validacion_impresion_dias,
    te.ingreso_impresion_dias AS dias_entrega,
    COALESCE(ms.meta_dias, 0) AS meta_dias,
    CASE
        WHEN te.ingreso_impresion_dias IS NOT NULL
             AND ms.meta_dias IS NOT NULL
             AND te.ingreso_impresion_dias > ms.meta_dias
        THEN true
        ELSE false
    END AS excede_meta,
    CASE
        WHEN te.ingreso_impresion_dias IS NULL OR ms.meta_dias IS NULL THEN NULL
        ELSE ROUND(ms.meta_dias - te.ingreso_impresion_dias, 4)
    END AS diferencia_dias
FROM tiempos_examen te
JOIN periodos p ON p.id = te.periodo_id
LEFT JOIN metas_seccion ms ON UPPER(TRIM(ms.seccion)) = UPPER(TRIM(te.seccion_padre))
WHERE te.seccion_padre IS NOT NULL
ORDER BY p.fecha_inicio, te.seccion_padre, te.examen;

-- ── Vista 4: Portafolio por seccion y periodo ─────────────────────────────────
CREATE OR REPLACE VIEW v_portafolio_seccion AS
SELECT
    p.anio,
    p.mes,
    p.fecha_inicio,
    p.fecha_fin,
    te.seccion_padre,
    COALESCE(ms.tipo, 'INMUNOXXI') AS tipo,
    COALESCE(ms.meta_dias, 0) AS meta_dias,
    COUNT(*) AS total_pruebas_portafolio,
    COUNT(*) FILTER (
        WHERE te.ingreso_impresion_dias IS NOT NULL
          AND ms.meta_dias IS NOT NULL
          AND te.ingreso_impresion_dias > ms.meta_dias
    ) AS pruebas_fuera_meta,
    ROUND(
        COUNT(*) FILTER (
            WHERE te.ingreso_impresion_dias IS NOT NULL
              AND ms.meta_dias IS NOT NULL
              AND te.ingreso_impresion_dias > ms.meta_dias
        )::numeric / NULLIF(COUNT(*), 0),
        4
    ) AS pct_fuera_meta,
    CASE
        WHEN ROUND(
            COUNT(*) FILTER (
                WHERE te.ingreso_impresion_dias IS NOT NULL
                  AND ms.meta_dias IS NOT NULL
                  AND te.ingreso_impresion_dias > ms.meta_dias
            )::numeric / NULLIF(COUNT(*), 0),
            4
        ) <= 0.05 THEN 'EN RANGO'
        WHEN ROUND(
            COUNT(*) FILTER (
                WHERE te.ingreso_impresion_dias IS NOT NULL
                  AND ms.meta_dias IS NOT NULL
                  AND te.ingreso_impresion_dias > ms.meta_dias
            )::numeric / NULLIF(COUNT(*), 0),
            4
        ) <= 0.10 THEN 'ALERTA'
        WHEN ROUND(
            COUNT(*) FILTER (
                WHERE te.ingreso_impresion_dias IS NOT NULL
                  AND ms.meta_dias IS NOT NULL
                  AND te.ingreso_impresion_dias > ms.meta_dias
            )::numeric / NULLIF(COUNT(*), 0),
            4
        ) <= 0.15 THEN 'ALARMA'
        ELSE 'CRITICO'
    END AS estado_tolerancia
FROM tiempos_examen te
JOIN periodos p ON p.id = te.periodo_id
LEFT JOIN metas_seccion ms ON UPPER(TRIM(ms.seccion)) = UPPER(TRIM(te.seccion_padre))
WHERE te.seccion_padre IS NOT NULL
GROUP BY p.anio, p.mes, p.fecha_inicio, p.fecha_fin, te.seccion_padre, ms.meta_dias, ms.tipo
ORDER BY p.fecha_inicio, te.seccion_padre;

-- ── Vista 5: Promedio acumulado por seccion ───────────────────────────────────
CREATE OR REPLACE VIEW v_promedio_acumulado AS
SELECT
    ts.seccion,
    COALESCE(ms.tipo, 'INMUNOXXI') AS tipo,
    p.anio,
    COALESCE(ms.meta_dias, 0) AS meta_dias,
    COUNT(*) AS meses_procesados,
    ROUND(AVG(ts.ingreso_impresion_dias), 4) AS promedio_acumulado_dias,
    CASE
        WHEN AVG(ts.ingreso_impresion_dias) > 0
             AND ms.meta_dias IS NOT NULL
             AND ms.meta_dias > 0
        THEN ROUND(ms.meta_dias / AVG(ts.ingreso_impresion_dias), 4)
        ELSE NULL
    END AS eficacia_acumulada,
    CASE
        WHEN ms.meta_dias IS NULL OR ms.meta_dias = 0 THEN 'SIN META'
        WHEN AVG(ts.ingreso_impresion_dias) IS NULL   THEN 'SIN DATOS'
        WHEN ms.meta_dias / NULLIF(AVG(ts.ingreso_impresion_dias), 0) >= 1.0  THEN 'CUMPLE'
        WHEN ms.meta_dias / NULLIF(AVG(ts.ingreso_impresion_dias), 0) >= 0.75 THEN 'ALERTA'
        ELSE 'NO CUMPLE'
    END AS estado_acumulado,
    MIN(p.fecha_inicio) AS desde,
    MAX(p.fecha_fin)    AS hasta
FROM tiempos_seccion ts
JOIN periodos p ON p.id = ts.periodo_id
LEFT JOIN metas_seccion ms ON UPPER(TRIM(ms.seccion)) = UPPER(TRIM(ts.seccion))
WHERE ts.ingreso_impresion_dias IS NOT NULL
GROUP BY ts.seccion, p.anio, ms.meta_dias, ms.tipo
ORDER BY p.anio, ts.seccion;

-- ── Vista 6: Fases por seccion y mes ─────────────────────────────────────────
-- Desglosa las 5 fases del pipeline, sus porcentajes sobre el total,
-- y detecta el cuello de botella entre las 3 fases independientes.
CREATE OR REPLACE VIEW v_fases_seccion AS
SELECT
    p.anio,
    p.mes,
    p.fecha_inicio,
    p.fecha_fin,
    ts.seccion,
    COALESCE(ms.tipo, 'INMUNOXXI') AS tipo,
    ts.total_examenes,
    -- Las 5 fases
    ts.ingreso_resultado_dias    AS fase1_procesamiento,
    ts.resultado_validacion_dias AS fase2_validacion,
    ts.ingreso_validacion_dias   AS fase3_ingreso_validacion,
    ts.validacion_impresion_dias AS fase4_impresion,
    ts.ingreso_impresion_dias    AS fase5_total,
    -- Meta y eficacia (computados en la vista, no dependen de n8n)
    COALESCE(ts.meta_dias, ms.meta_dias) AS meta_dias,
    CASE
        WHEN COALESCE(ts.meta_dias, ms.meta_dias) IS NOT NULL
             AND COALESCE(ts.meta_dias, ms.meta_dias) > 0
             AND ts.ingreso_impresion_dias IS NOT NULL
             AND ts.ingreso_impresion_dias > 0
        THEN ROUND(COALESCE(ts.meta_dias, ms.meta_dias) / ts.ingreso_impresion_dias, 4)
        ELSE NULL
    END AS eficacia,
    CASE
        WHEN COALESCE(ts.meta_dias, ms.meta_dias) IS NULL
             OR COALESCE(ts.meta_dias, ms.meta_dias) = 0 THEN 'SIN META'
        WHEN ts.ingreso_impresion_dias IS NULL
             OR ts.ingreso_impresion_dias = 0              THEN 'SIN DATOS'
        WHEN COALESCE(ts.meta_dias, ms.meta_dias) / ts.ingreso_impresion_dias >= 1.0  THEN 'CUMPLE'
        WHEN COALESCE(ts.meta_dias, ms.meta_dias) / ts.ingreso_impresion_dias >= 0.75 THEN 'ALERTA'
        ELSE 'NO CUMPLE'
    END AS estado_eficacia,
    -- Porcentaje de cada fase sobre fase5_total
    CASE WHEN ts.ingreso_impresion_dias > 0
        THEN ROUND(ts.ingreso_resultado_dias    / ts.ingreso_impresion_dias, 4)
        ELSE NULL
    END AS pct_fase1,
    CASE WHEN ts.ingreso_impresion_dias > 0
        THEN ROUND(ts.resultado_validacion_dias / ts.ingreso_impresion_dias, 4)
        ELSE NULL
    END AS pct_fase2,
    CASE WHEN ts.ingreso_impresion_dias > 0
        THEN ROUND(ts.ingreso_validacion_dias   / ts.ingreso_impresion_dias, 4)
        ELSE NULL
    END AS pct_fase3,
    CASE WHEN ts.ingreso_impresion_dias > 0
        THEN ROUND(ts.validacion_impresion_dias / ts.ingreso_impresion_dias, 4)
        ELSE NULL
    END AS pct_fase4,
    -- Cuello de botella: la mayor de las 3 fases independientes
    -- (procesamiento, validacion, impresion)
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
ORDER BY p.anio, p.fecha_inicio, ts.seccion;

-- ── Vista 7: Resumen global por periodo y tipo ────────────────────────────────
-- Promedio ponderado (por total_examenes) de las 5 fases agrupado por periodo.
-- Equivalente a la fila "Total" del reporte Enterprise que n8n descarta.
CREATE OR REPLACE VIEW v_resumen_global AS
SELECT
    p.anio,
    p.mes,
    p.fecha_inicio,
    p.fecha_fin,
    COALESCE(ms.tipo, 'INMUNOXXI') AS tipo,
    SUM(ts.total_examenes) AS total_examenes,
    ROUND(SUM(ts.ingreso_resultado_dias    * ts.total_examenes)
        / NULLIF(SUM(ts.total_examenes), 0), 4) AS ingreso_resultado_dias,
    ROUND(SUM(ts.resultado_validacion_dias * ts.total_examenes)
        / NULLIF(SUM(ts.total_examenes), 0), 4) AS resultado_validacion_dias,
    ROUND(SUM(ts.ingreso_validacion_dias   * ts.total_examenes)
        / NULLIF(SUM(ts.total_examenes), 0), 4) AS ingreso_validacion_dias,
    ROUND(SUM(ts.validacion_impresion_dias * ts.total_examenes)
        / NULLIF(SUM(ts.total_examenes), 0), 4) AS validacion_impresion_dias,
    ROUND(SUM(ts.ingreso_impresion_dias    * ts.total_examenes)
        / NULLIF(SUM(ts.total_examenes), 0), 4) AS ingreso_impresion_dias
FROM tiempos_seccion ts
JOIN periodos p ON p.id = ts.periodo_id
LEFT JOIN metas_seccion ms ON UPPER(TRIM(ms.seccion)) = UPPER(TRIM(ts.seccion))
WHERE ts.ingreso_impresion_dias IS NOT NULL
GROUP BY p.anio, p.mes, p.fecha_inicio, p.fecha_fin, ms.tipo
ORDER BY p.fecha_inicio, ms.tipo;
