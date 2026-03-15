-- ============================================
-- Vistas para analisis por Seccion + Examen
-- Laboratorio InmunoXXI
-- Esquema: tiempos_entrega
-- ============================================

SET search_path TO tiempos_entrega, public;

-- Vista: Detalle por examen con seccion, dias, META y si excede la meta
CREATE OR REPLACE VIEW v_examenes_seccion AS
SELECT
    p.anio,
    p.mes,
    p.fecha_inicio,
    p.fecha_fin,
    te.seccion_padre,
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

-- Vista: Resumen portafolio por seccion y periodo
CREATE OR REPLACE VIEW v_portafolio_seccion AS
SELECT
    p.anio,
    p.mes,
    p.fecha_inicio,
    p.fecha_fin,
    te.seccion_padre,
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
GROUP BY p.anio, p.mes, p.fecha_inicio, p.fecha_fin, te.seccion_padre, ms.meta_dias
ORDER BY p.fecha_inicio, te.seccion_padre;

-- Vista: Promedio acumulado por seccion
CREATE OR REPLACE VIEW v_promedio_acumulado AS
SELECT
    ts.seccion,
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
        WHEN AVG(ts.ingreso_impresion_dias) IS NULL THEN 'SIN DATOS'
        WHEN ms.meta_dias / NULLIF(AVG(ts.ingreso_impresion_dias), 0) >= 1.0 THEN 'CUMPLE'
        WHEN ms.meta_dias / NULLIF(AVG(ts.ingreso_impresion_dias), 0) >= 0.75 THEN 'ALERTA'
        ELSE 'NO CUMPLE'
    END AS estado_acumulado,
    MIN(p.fecha_inicio) AS desde,
    MAX(p.fecha_inicio) AS hasta
FROM tiempos_seccion ts
JOIN periodos p ON p.id = ts.periodo_id
LEFT JOIN metas_seccion ms ON UPPER(TRIM(ms.seccion)) = UPPER(TRIM(ts.seccion))
WHERE ts.ingreso_impresion_dias IS NOT NULL
GROUP BY ts.seccion, p.anio, ms.meta_dias
ORDER BY p.anio, ts.seccion;

-- Indice para consultas rapidas por seccion_padre
CREATE INDEX IF NOT EXISTS idx_tiempos_examen_seccion_padre ON tiempos_examen(seccion_padre);
