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
    tipo        VARCHAR(20) NOT NULL DEFAULT 'INMUNOXXI',
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

-- Indices
CREATE INDEX IF NOT EXISTS idx_tiempos_seccion_periodo ON tiempos_seccion(periodo_id);
CREATE INDEX IF NOT EXISTS idx_tiempos_examen_periodo ON tiempos_examen(periodo_id);
CREATE INDEX IF NOT EXISTS idx_periodos_anio_mes ON periodos(anio, mes);
CREATE INDEX IF NOT EXISTS idx_tiempos_examen_seccion_padre ON tiempos_examen(seccion_padre);

-- ============================================
-- METAs por defecto
-- ============================================
INSERT INTO metas_seccion (seccion, meta_dias, tipo) VALUES
    ('INMUNODIAGNÓSTICO',               7.0,  'INMUNOXXI'),
    ('PRUEBAS ESPECIALES',              3.0,  'INMUNOXXI'),
    ('QUÍMICA',                         0.5,  'INMUNOXXI'),
    ('HEMOSTASIA Y TROMBOSIS',          3.0,  'INMUNOXXI'),
    ('HEMATOLOGÍA',                     0.5,  'INMUNOXXI'),
    ('CITOMETRIA',                      0.0,  'INMUNOXXI'),
    ('INHIBIDOR LUPICO',                5.0,  'INMUNOXXI'),
    ('UROANÁLISIS',                     0.5,  'INMUNOXXI'),
    ('LIQUIDO SINOVIAL',                3.0,  'INMUNOXXI'),
    ('BIOLOGIA MOLECULAR',              7.0,  'INMUNOXXI'),
    ('COVID-19',                        1.0,  'INMUNOXXI'),
    ('ETIQUETAS - HISTORIAL',           1.0,  'INMUNOXXI'),
    ('PRUEBAS ESPECIALES 3-MP',         5.0,  'REFERIDO'),
    ('PRUEBAS ESPECIALES 2-SL',         5.0,  'REFERIDO'),
    ('QUEST DIAGNOSTICS',              15.0,  'REFERIDO'),
    ('MAYO MEDICAL LAB',               15.0,  'REFERIDO'),
    ('UNIDIN',                         10.0,  'REFERIDO'),
    ('INMUNODIAGNOSTICO 2',             5.0,  'REFERIDO'),
    ('EXAMINA',                         2.0,  'REFERIDO')
ON CONFLICT (seccion) DO NOTHING;
