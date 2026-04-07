-- ============================================
-- Migraciones idempotentes
-- Laboratorio InmunoXXI
-- ============================================
-- Este archivo aplica cambios incrementales a bases de datos
-- existentes. Usa IF NOT EXISTS y guards condicionales para
-- que sea seguro ejecutarlo multiples veces.
-- Corre entre 01-schema.sql y 03-portal.sql por orden alfabetico.
-- ============================================

-- ── Schema tiempos_entrega: nuevas tablas ──

SET search_path TO tiempos_entrega, public;

-- Metas por periodo (override mensual)
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

CREATE INDEX IF NOT EXISTS idx_metas_periodo_seccion ON metas_periodo(seccion);
CREATE INDEX IF NOT EXISTS idx_metas_periodo_anio_mes ON metas_periodo(anio, mes);

-- Examenes excluidos del portafolio
CREATE TABLE IF NOT EXISTS examenes_excluidos (
    id              SERIAL PRIMARY KEY,
    seccion         VARCHAR(255) NOT NULL,
    codigo_examen   VARCHAR(100) NOT NULL,
    nombre_examen   TEXT,
    motivo          VARCHAR(255),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(seccion, codigo_examen)
);

CREATE INDEX IF NOT EXISTS idx_examenes_excluidos_seccion ON examenes_excluidos(seccion);

-- Configuracion de tolerancias
CREATE TABLE IF NOT EXISTS config_tolerancias (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(50) NOT NULL DEFAULT 'default',
    anio                INTEGER,
    mes                 VARCHAR(20),
    umbral_en_rango     NUMERIC(5,4) NOT NULL DEFAULT 0.10,
    umbral_alerta       NUMERIC(5,4) NOT NULL DEFAULT 0.15,
    umbral_critico      NUMERIC(5,4) NOT NULL DEFAULT 0.20,
    umbral_dias_cumple  NUMERIC(10,4) NOT NULL DEFAULT 10.0,
    umbral_dias_alerta  NUMERIC(10,4) NOT NULL DEFAULT 15.0,
    umbral_dias_critico NUMERIC(10,4) NOT NULL DEFAULT 20.0,
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_config_tolerancias_unique
    ON config_tolerancias (COALESCE(anio, 0), COALESCE(mes, 'ALL'));

-- Seed default tolerances
INSERT INTO config_tolerancias (nombre, anio, mes, umbral_en_rango, umbral_alerta, umbral_critico, umbral_dias_cumple, umbral_dias_alerta, umbral_dias_critico)
VALUES ('default', NULL, NULL, 0.10, 0.15, 0.20, 10.0, 15.0, 20.0)
ON CONFLICT DO NOTHING;

-- ── Actualizar metas defaults a valores 2026 ──
-- Solo actualiza si el valor aun es el original (guard condicional)
UPDATE metas_seccion SET meta_dias = 5.0, updated_at = NOW()
    WHERE seccion = 'HEMOSTASIA Y TROMBOSIS' AND meta_dias = 3.0;
UPDATE metas_seccion SET meta_dias = 1.0, updated_at = NOW()
    WHERE seccion = 'HEMATOLOGÍA' AND meta_dias = 0.5;
UPDATE metas_seccion SET meta_dias = 1.0, updated_at = NOW()
    WHERE seccion = 'UROANÁLISIS' AND meta_dias = 0.5;
UPDATE metas_seccion SET meta_dias = 1.0, updated_at = NOW()
    WHERE seccion = 'QUÍMICA' AND meta_dias = 0.5;
UPDATE metas_seccion SET meta_dias = 9.0, updated_at = NOW()
    WHERE seccion = 'BIOLOGIA MOLECULAR' AND meta_dias = 7.0;

-- ── Limpiar espacios en codigos de examen (Enterprise exporta con padding) ──
-- Normaliza "3999           -Contaje Celular" → "3999-Contaje Celular"
UPDATE tiempos_examen
  SET examen = TRIM(SPLIT_PART(examen, '-', 1)) || '-' || TRIM(SUBSTR(examen, STRPOS(examen, '-') + 1))
  WHERE STRPOS(examen, '-') > 0
    AND SPLIT_PART(examen, '-', 1) <> TRIM(SPLIT_PART(examen, '-', 1));

-- Limpiar codigos en examenes_excluidos por si se insertaron con espacios
UPDATE examenes_excluidos SET codigo_examen = TRIM(codigo_examen)
  WHERE codigo_examen <> TRIM(codigo_examen);

-- ── Schema portal_config: permisos granulares ──

SET search_path TO portal_config;

-- Agregar columnas de permisos a tabla existente
ALTER TABLE usuario_automatizacion ADD COLUMN IF NOT EXISTS puede_cargar BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE usuario_automatizacion ADD COLUMN IF NOT EXISTS puede_editar_metas BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE usuario_automatizacion ADD COLUMN IF NOT EXISTS puede_editar_examenes BOOLEAN NOT NULL DEFAULT false;
