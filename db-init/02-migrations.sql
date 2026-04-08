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

-- ============================================
-- Normalizacion de DB: tabla catalogo secciones + examenes + log_importacion
-- ============================================

SET search_path TO tiempos_entrega, public;

-- Extensión unaccent para normalizar tildes en JOINs
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ── Tabla catalogo: secciones ──

CREATE TABLE IF NOT EXISTS secciones (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(255) NOT NULL,
    nombre_norm VARCHAR(255) NOT NULL,
    tipo        VARCHAR(20)  NOT NULL DEFAULT 'INMUNOXXI',
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(nombre_norm)
);

CREATE INDEX IF NOT EXISTS idx_secciones_nombre_norm ON secciones(nombre_norm);

-- ── Tabla catalogo: examenes ──

CREATE TABLE IF NOT EXISTS examenes (
    id          SERIAL PRIMARY KEY,
    seccion_id  INTEGER NOT NULL REFERENCES secciones(id),
    codigo      VARCHAR(100) NOT NULL,
    nombre      TEXT NOT NULL,
    codigo_norm VARCHAR(100) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(seccion_id, codigo_norm)
);

CREATE INDEX IF NOT EXISTS idx_examenes_seccion_id  ON examenes(seccion_id);
CREATE INDEX IF NOT EXISTS idx_examenes_codigo_norm ON examenes(codigo_norm);

-- ── Tabla log de importacion ──

CREATE TABLE IF NOT EXISTS log_importacion (
    id           SERIAL PRIMARY KEY,
    archivo      VARCHAR(255) NOT NULL,
    webhook      VARCHAR(100) NOT NULL,
    periodo      VARCHAR(20),
    estado       VARCHAR(20)  NOT NULL,
    secciones_ok INTEGER DEFAULT 0,
    examenes_ok  INTEGER DEFAULT 0,
    detalle      JSONB,
    created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_importacion_created ON log_importacion(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_importacion_estado  ON log_importacion(estado);

-- ── Poblar secciones desde datos existentes ──

-- Primero desde metas_seccion (fuente canonica con tipo ya asignado)
INSERT INTO secciones (nombre, nombre_norm, tipo)
SELECT seccion, UPPER(TRIM(unaccent(seccion))), tipo
FROM metas_seccion
ON CONFLICT (nombre_norm) DO NOTHING;

-- Secciones en tiempos_seccion que no esten en metas_seccion
INSERT INTO secciones (nombre, nombre_norm)
SELECT DISTINCT seccion, UPPER(TRIM(unaccent(seccion)))
FROM tiempos_seccion
WHERE UPPER(TRIM(unaccent(seccion))) NOT IN (SELECT nombre_norm FROM secciones)
ON CONFLICT (nombre_norm) DO NOTHING;

-- Secciones en tiempos_examen.seccion_padre
INSERT INTO secciones (nombre, nombre_norm)
SELECT DISTINCT seccion_padre, UPPER(TRIM(unaccent(seccion_padre)))
FROM tiempos_examen
WHERE seccion_padre IS NOT NULL
  AND UPPER(TRIM(unaccent(seccion_padre))) NOT IN (SELECT nombre_norm FROM secciones)
ON CONFLICT (nombre_norm) DO NOTHING;

-- ── Poblar examenes desde datos existentes ──

INSERT INTO examenes (seccion_id, codigo, nombre, codigo_norm)
SELECT DISTINCT
    s.id,
    TRIM(SPLIT_PART(te.examen, '-', 1)),
    TRIM(SUBSTR(te.examen, STRPOS(te.examen, '-') + 1)),
    TRIM(SPLIT_PART(te.examen, '-', 1))
FROM tiempos_examen te
JOIN secciones s ON s.nombre_norm = UPPER(TRIM(unaccent(te.seccion_padre)))
WHERE te.seccion_padre IS NOT NULL
  AND STRPOS(te.examen, '-') > 0
ON CONFLICT (seccion_id, codigo_norm) DO NOTHING;

-- ── Agregar columnas FK a las tablas (sin borrar columnas de texto) ──

ALTER TABLE metas_seccion      ADD COLUMN IF NOT EXISTS seccion_id INTEGER REFERENCES secciones(id);
ALTER TABLE tiempos_seccion    ADD COLUMN IF NOT EXISTS seccion_id INTEGER REFERENCES secciones(id);
ALTER TABLE tiempos_examen     ADD COLUMN IF NOT EXISTS seccion_id INTEGER REFERENCES secciones(id);
ALTER TABLE tiempos_examen     ADD COLUMN IF NOT EXISTS examen_id  INTEGER REFERENCES examenes(id);
ALTER TABLE metas_periodo      ADD COLUMN IF NOT EXISTS seccion_id INTEGER REFERENCES secciones(id);
ALTER TABLE examenes_excluidos ADD COLUMN IF NOT EXISTS seccion_id INTEGER REFERENCES secciones(id);
ALTER TABLE examenes_excluidos ADD COLUMN IF NOT EXISTS examen_id  INTEGER REFERENCES examenes(id);

-- ── Backfill seccion_id en todas las tablas ──

UPDATE metas_seccion ms SET seccion_id = s.id
FROM secciones s
WHERE UPPER(TRIM(unaccent(ms.seccion))) = s.nombre_norm
  AND ms.seccion_id IS NULL;

UPDATE tiempos_seccion ts SET seccion_id = s.id
FROM secciones s
WHERE UPPER(TRIM(unaccent(ts.seccion))) = s.nombre_norm
  AND ts.seccion_id IS NULL;

UPDATE tiempos_examen te SET seccion_id = s.id
FROM secciones s
WHERE te.seccion_padre IS NOT NULL
  AND UPPER(TRIM(unaccent(te.seccion_padre))) = s.nombre_norm
  AND te.seccion_id IS NULL;

UPDATE metas_periodo mp SET seccion_id = s.id
FROM secciones s
WHERE UPPER(TRIM(unaccent(mp.seccion))) = s.nombre_norm
  AND mp.seccion_id IS NULL;

UPDATE examenes_excluidos ee SET seccion_id = s.id
FROM secciones s
WHERE UPPER(TRIM(unaccent(ee.seccion))) = s.nombre_norm
  AND ee.seccion_id IS NULL;

-- ── Backfill examen_id ──

UPDATE tiempos_examen te SET examen_id = e.id
FROM examenes e
WHERE e.seccion_id = te.seccion_id
  AND e.codigo_norm = TRIM(SPLIT_PART(te.examen, '-', 1))
  AND te.examen_id IS NULL
  AND te.seccion_id IS NOT NULL;

UPDATE examenes_excluidos ee SET examen_id = e.id
FROM examenes e
WHERE e.seccion_id = ee.seccion_id
  AND e.codigo_norm = TRIM(ee.codigo_examen)
  AND ee.examen_id IS NULL
  AND ee.seccion_id IS NOT NULL;

-- ── Indices en nuevas FK ──

CREATE INDEX IF NOT EXISTS idx_metas_seccion_seccion_id      ON metas_seccion(seccion_id);
CREATE INDEX IF NOT EXISTS idx_tiempos_seccion_seccion_id    ON tiempos_seccion(seccion_id);
CREATE INDEX IF NOT EXISTS idx_tiempos_examen_seccion_id     ON tiempos_examen(seccion_id);
CREATE INDEX IF NOT EXISTS idx_tiempos_examen_examen_id      ON tiempos_examen(examen_id);
CREATE INDEX IF NOT EXISTS idx_metas_periodo_seccion_id      ON metas_periodo(seccion_id);
CREATE INDEX IF NOT EXISTS idx_examenes_excluidos_seccion_id ON examenes_excluidos(seccion_id);
CREATE INDEX IF NOT EXISTS idx_examenes_excluidos_examen_id  ON examenes_excluidos(examen_id);

-- ── Endurecer NOT NULL donde el backfill es seguro ──
-- Solo se aplica si no quedan filas sin backfillear (guard condicional)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM metas_seccion WHERE seccion_id IS NULL) THEN
    ALTER TABLE metas_seccion ALTER COLUMN seccion_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tiempos_seccion WHERE seccion_id IS NULL) THEN
    ALTER TABLE tiempos_seccion ALTER COLUMN seccion_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM metas_periodo WHERE seccion_id IS NULL) THEN
    ALTER TABLE metas_periodo ALTER COLUMN seccion_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM examenes_excluidos WHERE seccion_id IS NULL) THEN
    ALTER TABLE examenes_excluidos ALTER COLUMN seccion_id SET NOT NULL;
  END IF;
END $$;
-- Nota: tiempos_examen.seccion_id y examen_id NO se endurecen aqui porque
-- puede haber data legacy del webhook-global sin seccion_padre. Se endurecen
-- en un deploy futuro despues de verificar que todos los workflows insertan correctamente.
