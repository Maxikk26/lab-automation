-- ============================================
-- Portal - Usuarios, Automatizaciones, Permisos
-- Laboratorio InmunoXXI
-- ============================================
-- Esquema: portal_config
-- Tablas de configuracion del portal web:
-- usuarios, automatizaciones y asignaciones.
-- Los hashes de password usan bcrypt (generados por el backend).
-- ============================================

CREATE SCHEMA IF NOT EXISTS portal_config;
ALTER ROLE labadmin SET search_path TO tiempos_entrega, portal_config, public;
SET search_path TO portal_config;

-- ── Usuarios del portal ──
CREATE TABLE IF NOT EXISTS usuarios (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(100) NOT NULL UNIQUE,
    pwd_hash    VARCHAR(255) NOT NULL,
    nombre      VARCHAR(255) NOT NULL,
    es_admin    BOOLEAN DEFAULT false,
    activo      BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- ── Categorias de automatizaciones ──
CREATE TABLE IF NOT EXISTS categorias (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL UNIQUE,
    icono   VARCHAR(50) DEFAULT 'folder',
    orden   INTEGER DEFAULT 0
);

-- ── Catalogo de automatizaciones ──
CREATE TABLE IF NOT EXISTS automatizaciones (
    id              SERIAL PRIMARY KEY,
    categoria_id    INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    nombre          VARCHAR(255) NOT NULL,
    descripcion     TEXT,
    instrucciones   TEXT,
    webhook_path    VARCHAR(255) NOT NULL,
    extensiones     TEXT[] DEFAULT ARRAY['.xls'],
    max_archivos    INTEGER DEFAULT 10,
    icono           VARCHAR(50) DEFAULT 'layers',
    activo          BOOLEAN DEFAULT true,
    orden           INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ── Tabla puente: que usuario ve que automatizacion ──
CREATE TABLE IF NOT EXISTS usuario_automatizacion (
    usuario_id          INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    automatizacion_id   INTEGER NOT NULL REFERENCES automatizaciones(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, automatizacion_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_ua_usuario ON usuario_automatizacion(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ua_automatizacion ON usuario_automatizacion(automatizacion_id);
CREATE INDEX IF NOT EXISTS idx_automatizaciones_categoria ON automatizaciones(categoria_id);

-- ============================================
-- Datos iniciales
-- ============================================

-- Categorias
INSERT INTO categorias (nombre, icono, orden) VALUES
    ('Tiempos de Entrega', 'clock', 1)
ON CONFLICT (nombre) DO NOTHING;

-- Automatizaciones existentes
INSERT INTO automatizaciones (categoria_id, nombre, descripcion, instrucciones, webhook_path, extensiones, max_archivos, icono, orden) VALUES
    (
        (SELECT id FROM categorias WHERE nombre = 'Tiempos de Entrega'),
        'Tiempos por Seccion',
        'Procesa archivos .xls individuales exportados por seccion desde Enterprise. Cada archivo contiene los examenes de una sola seccion.',
        'Exporte desde Enterprise filtrando por seccion individual (ej: solo Quimica, solo Inmunodiagnostico). Puede subir todos los archivos de secciones a la vez.',
        '/api/webhook/tiempos-seccion',
        ARRAY['.xls'],
        30,
        'layers',
        1
    ),
    (
        (SELECT id FROM categorias WHERE nombre = 'Tiempos de Entrega'),
        'Tiempos Global',
        'Procesa el archivo .xls global con todas las secciones consolidadas en un solo reporte.',
        'Exporte desde Enterprise el reporte completo de tiempos de entrega (todas las secciones). Suba un solo archivo.',
        '/api/webhook/tiempos-global',
        ARRAY['.xls'],
        1,
        'globe',
        2
    ),
    (
        (SELECT id FROM categorias WHERE nombre = 'Tiempos de Entrega'),
        'Tiempos Unificado (Multi-Pestaña)',
        'Procesa un archivo .xls con multiples pestañas, donde cada pestaña es una seccion. Experimental: ideal cuando se unifican los reportes por seccion en un solo archivo.',
        'Unifique los archivos .xls por seccion en un solo archivo, colocando cada seccion en una pestaña separada. Suba un solo archivo.',
        '/api/webhook/tiempos-unificado',
        ARRAY['.xls'],
        1,
        'file-stack',
        3
    );

-- Usuario admin por defecto (password: admin123, hash bcrypt)
INSERT INTO usuarios (username, pwd_hash, nombre, es_admin) VALUES
    ('admin', '$2a$10$qNGcx6lQbQG2UNcRjkbg5uKlmqVcDxQbHCa0TBjXeVodHCDWiDK7y', 'Administrador', true)
ON CONFLICT (username) DO NOTHING;

-- Admin ve todas las automatizaciones
INSERT INTO usuario_automatizacion (usuario_id, automatizacion_id)
SELECT u.id, a.id
FROM usuarios u, automatizaciones a
WHERE u.username = 'admin'
ON CONFLICT DO NOTHING;
