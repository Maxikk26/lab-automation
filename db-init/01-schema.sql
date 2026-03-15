-- ============================================
-- Lab Tiempos de Entrega - Schema
-- Laboratorio InmunoXXI
-- ============================================
-- Esquema: tiempos_entrega
-- Todas las tablas y vistas de esta automatizacion
-- viven dentro de este esquema, permitiendo que
-- futuras automatizaciones tengan su propio espacio.
-- ============================================

-- Crear esquema
CREATE SCHEMA IF NOT EXISTS tiempos_entrega;

-- Configurar search_path para que las queries funcionen
-- sin prefijo de esquema (transparente para n8n y Power BI)
ALTER ROLE labadmin SET search_path TO tiempos_entrega, public;
SET search_path TO tiempos_entrega, public;

-- Tabla de periodos (un registro por cada archivo procesado)
CREATE TABLE IF NOT EXISTS periodos (
    id              SERIAL PRIMARY KEY,
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE NOT NULL,
    mes             VARCHAR(20) NOT NULL,
    anio            INTEGER NOT NULL,
    archivo_origen  VARCHAR(255),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(fecha_inicio, fecha_fin)
);

-- Metas por seccion (configurables por el usuario)
CREATE TABLE IF NOT EXISTS metas_seccion (
    id          SERIAL PRIMARY KEY,
    seccion     VARCHAR(255) NOT NULL UNIQUE,
    meta_dias   NUMERIC(10,4) NOT NULL,
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Tiempos por seccion resumen (las filas principales del reporte)
CREATE TABLE IF NOT EXISTS tiempos_seccion (
    id                          SERIAL PRIMARY KEY,
    periodo_id                  INTEGER NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
    seccion                     VARCHAR(255) NOT NULL,
    total_examenes              INTEGER DEFAULT 0,
    ingreso_resultado_horas     VARCHAR(50),
    resultado_validacion_horas  VARCHAR(50),
    ingreso_validacion_horas    VARCHAR(50),
    validacion_impresion_horas  VARCHAR(50),
    ingreso_impresion_horas     VARCHAR(50),
    ingreso_resultado_dias      NUMERIC(10,4),
    resultado_validacion_dias   NUMERIC(10,4),
    ingreso_validacion_dias     NUMERIC(10,4),
    validacion_impresion_dias   NUMERIC(10,4),
    ingreso_impresion_dias      NUMERIC(10,4),
    meta_dias                   NUMERIC(10,4),
    eficacia                    NUMERIC(10,4),
    created_at                  TIMESTAMP DEFAULT NOW(),
    UNIQUE(periodo_id, seccion)
);

-- Tiempos por examen individual (detalle granular)
CREATE TABLE IF NOT EXISTS tiempos_examen (
    id                          SERIAL PRIMARY KEY,
    periodo_id                  INTEGER NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
    seccion_padre               VARCHAR(255),
    examen                      TEXT NOT NULL,
    total_examenes              INTEGER DEFAULT 0,
    ingreso_resultado_horas     VARCHAR(50),
    resultado_validacion_horas  VARCHAR(50),
    ingreso_validacion_horas    VARCHAR(50),
    validacion_impresion_horas  VARCHAR(50),
    ingreso_impresion_horas     VARCHAR(50),
    ingreso_resultado_dias      NUMERIC(10,4),
    resultado_validacion_dias   NUMERIC(10,4),
    ingreso_validacion_dias     NUMERIC(10,4),
    validacion_impresion_dias   NUMERIC(10,4),
    ingreso_impresion_dias      NUMERIC(10,4),
    created_at                  TIMESTAMP DEFAULT NOW()
);

-- Vista para reporte mensual con eficacia
CREATE OR REPLACE VIEW v_reporte_mensual AS
SELECT
    p.anio,
    p.mes,
    p.fecha_inicio,
    p.fecha_fin,
    ts.seccion,
    ts.total_examenes,
    ts.ingreso_resultado_dias,
    ts.resultado_validacion_dias,
    ts.ingreso_validacion_dias,
    ts.validacion_impresion_dias,
    ts.ingreso_impresion_dias,
    COALESCE(ts.meta_dias, ms.meta_dias) AS meta_dias,
    ts.eficacia,
    CASE
        WHEN ts.eficacia IS NULL THEN 'SIN META'
        WHEN ts.eficacia >= 1.0 THEN 'CUMPLE'
        WHEN ts.eficacia >= 0.75 THEN 'ALERTA'
        ELSE 'NO CUMPLE'
    END AS estado_eficacia
FROM tiempos_seccion ts
JOIN periodos p ON p.id = ts.periodo_id
LEFT JOIN metas_seccion ms ON UPPER(TRIM(ms.seccion)) = UPPER(TRIM(ts.seccion))
ORDER BY p.anio, p.fecha_inicio, ts.seccion;

-- Vista para tendencia anual
CREATE OR REPLACE VIEW v_tendencia_anual AS
SELECT
    p.anio,
    p.mes,
    p.fecha_inicio,
    ts.seccion,
    ts.ingreso_impresion_dias AS dias_entrega,
    COALESCE(ts.meta_dias, ms.meta_dias) AS meta_dias,
    ts.eficacia
FROM tiempos_seccion ts
JOIN periodos p ON p.id = ts.periodo_id
LEFT JOIN metas_seccion ms ON UPPER(TRIM(ms.seccion)) = UPPER(TRIM(ts.seccion))
ORDER BY p.anio, p.fecha_inicio, ts.seccion;

-- Indices
CREATE INDEX IF NOT EXISTS idx_tiempos_seccion_periodo ON tiempos_seccion(periodo_id);
CREATE INDEX IF NOT EXISTS idx_tiempos_examen_periodo ON tiempos_examen(periodo_id);
CREATE INDEX IF NOT EXISTS idx_periodos_anio_mes ON periodos(anio, mes);

-- ============================================
-- METAs por defecto
-- ============================================
INSERT INTO metas_seccion (seccion, meta_dias) VALUES
    ('INMUNODIAGNÓSTICO',               7.0),
    ('PRUEBAS ESPECIALES',              5.0),
    ('QUÍMICA',                         0.5),
    ('HEMOSTASIA Y TROMBOSIS',          0.5),
    ('HEMATOLOGÍA',                     0.5),
    ('CITOMETRIA',                      0.0),
    ('INHIBIDOR LUPICO',                5.0),
    ('UROANÁLISIS',                     0.5),
    ('LIQUIDO SINOVIAL',                5.0),
    ('BIOLOGIA MOLECULAR',             10.0),
    ('PRUEBAS ESPECIALES 3-MP',         5.0),
    ('PRUEBAS ESPECIALES 2-SL',         5.0),
    ('COVID-19',                        1.0),
    ('QUEST DIAGNOSTICS',              15.0),
    ('MAYO MEDICAL LAB',               15.0),
    ('UNIDIN',                         10.0),
    ('INMUNODIAGNOSTICO 2',             7.0),
    ('ETIQUETAS - HISTORIAL',           1.0),
    ('EXAMINA',                         2.0)
ON CONFLICT (seccion) DO NOTHING;
