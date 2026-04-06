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

-- Metas por periodo (override mensual, hereda de metas_seccion si no existe)
CREATE TABLE IF NOT EXISTS metas_periodo (
    id          SERIAL PRIMARY KEY,
    seccion     VARCHAR(255) NOT NULL,
    anio        INTEGER NOT NULL,
    mes         VARCHAR(20) NOT NULL,
    meta_dias   NUMERIC(10,4) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(seccion, anio, mes)
);

-- Examenes excluidos del conteo de portafolio (sub-componentes)
CREATE TABLE IF NOT EXISTS examenes_excluidos (
    id              SERIAL PRIMARY KEY,
    seccion         VARCHAR(255) NOT NULL,
    codigo_examen   VARCHAR(100) NOT NULL,
    nombre_examen   TEXT,
    motivo          VARCHAR(255),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(seccion, codigo_examen)
);

-- Configuracion de tolerancias (umbrales parametrizables)
CREATE TABLE IF NOT EXISTS config_tolerancias (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(50) NOT NULL DEFAULT 'default',
    anio                INTEGER,
    mes                 VARCHAR(20),
    -- Portafolio: % de pruebas fuera de meta
    umbral_en_rango     NUMERIC(5,4) NOT NULL DEFAULT 0.10,
    umbral_alerta       NUMERIC(5,4) NOT NULL DEFAULT 0.15,
    umbral_critico      NUMERIC(5,4) NOT NULL DEFAULT 0.20,
    -- Examenes: umbrales absolutos en dias
    umbral_dias_cumple  NUMERIC(10,4) NOT NULL DEFAULT 10.0,
    umbral_dias_alerta  NUMERIC(10,4) NOT NULL DEFAULT 15.0,
    umbral_dias_critico NUMERIC(10,4) NOT NULL DEFAULT 20.0,
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Unique index que maneja NULLs para el default global
CREATE UNIQUE INDEX IF NOT EXISTS idx_config_tolerancias_unique
    ON config_tolerancias (COALESCE(anio, 0), COALESCE(mes, 'ALL'));

-- Indices
CREATE INDEX IF NOT EXISTS idx_tiempos_seccion_periodo ON tiempos_seccion(periodo_id);
CREATE INDEX IF NOT EXISTS idx_tiempos_examen_periodo ON tiempos_examen(periodo_id);
CREATE INDEX IF NOT EXISTS idx_periodos_anio_mes ON periodos(anio, mes);
CREATE INDEX IF NOT EXISTS idx_tiempos_examen_seccion_padre ON tiempos_examen(seccion_padre);
CREATE INDEX IF NOT EXISTS idx_metas_periodo_seccion ON metas_periodo(seccion);
CREATE INDEX IF NOT EXISTS idx_metas_periodo_anio_mes ON metas_periodo(anio, mes);
CREATE INDEX IF NOT EXISTS idx_examenes_excluidos_seccion ON examenes_excluidos(seccion);

-- ============================================
-- METAs por defecto (valores 2026)
-- ============================================
INSERT INTO metas_seccion (seccion, meta_dias, tipo) VALUES
    ('INMUNODIAGN��STICO',               7.0,  'INMUNOXXI'),
    ('PRUEBAS ESPECIALES',              3.0,  'INMUNOXXI'),
    ('QUÍMICA',                         1.0,  'INMUNOXXI'),
    ('HEMOSTASIA Y TROMBOSIS',          5.0,  'INMUNOXXI'),
    ('HEMATOLOGÍA',                     1.0,  'INMUNOXXI'),
    ('CITOMETRIA',                      0.0,  'INMUNOXXI'),
    ('INHIBIDOR LUPICO',                5.0,  'INMUNOXXI'),
    ('UROANÁLISIS',                     1.0,  'INMUNOXXI'),
    ('LIQUIDO SINOVIAL',                3.0,  'INMUNOXXI'),
    ('BIOLOGIA MOLECULAR',              9.0,  'INMUNOXXI'),
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

-- ============================================
-- Tolerancias por defecto
-- ============================================
INSERT INTO config_tolerancias (nombre, anio, mes, umbral_en_rango, umbral_alerta, umbral_critico, umbral_dias_cumple, umbral_dias_alerta, umbral_dias_critico)
VALUES ('default', NULL, NULL, 0.10, 0.15, 0.20, 10.0, 15.0, 20.0)
ON CONFLICT DO NOTHING;
