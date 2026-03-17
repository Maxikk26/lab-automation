# Control de Cambios — Vistas Metabase + Metas

**Fecha:** 2026-03-16
**Ambiente probado:** Local (Docker Desktop, Windows 11)
**Aplica a:** Produccion (Ubuntu Server)

---

## Resumen de Cambios

1. **Fix critico:** `v_reporte_mensual` y `v_fases_seccion` mostraban eficacia=NULL y estado="SIN META" para todas las secciones. Causa: usaban `ts.eficacia` almacenado por n8n (que nunca lo pudo calcular). Ahora se computa directamente en la vista.
2. **Fix:** `v_tendencia_anual` tambien usaba `ts.eficacia` almacenado. Ahora se computa en la vista.
3. **Fix:** `apply-views.ts` fallaba con `__dirname is not defined` (ES modules). Las vistas nunca se aplicaban al reiniciar el backend.
4. **Metas actualizadas** segun Excel TER 2025 (5 secciones con valores incorrectos).
5. **Nueva columna `tipo`** en `metas_seccion` para clasificar secciones como INMUNOXXI o REFERIDO.
6. **Columna `tipo` expuesta** en las 6 vistas existentes para filtrar en Metabase.
7. **Nueva vista `v_resumen_global`** — promedio ponderado global por periodo y tipo.
8. **Dashboard de Metabase** exportado y automatizable via script.

---

## Archivos Modificados

| Archivo | Cambio |
|---|---|
| `backend/src/apply-views.ts` | Fix `__dirname` → `fileURLToPath(import.meta.url)` |
| `db-views/views.sql` | Fix eficacia en 3 vistas, `tipo` en 6 vistas, nueva `v_resumen_global` |
| `db-init/01-schema.sql` | Columna `tipo` en tabla + metas actualizadas + clasificacion |
| `scripts/metabase-export.json` | Export del dashboard (preguntas, layout, visualizaciones) |
| `scripts/import-metabase.py` | Script para importar dashboard en cualquier Metabase |

---

## Pasos para Replicar en Produccion

### Pre-requisitos

- Acceso SSH al servidor Ubuntu
- El repo actualizado con los cambios (git pull)
- Metabase configurado con la base de datos conectada (ver `docs/METABASE-GUIA.md` pasos 1-3)
- Ubuntu trae `python3` preinstalado (no hay que instalar nada adicional)

### Paso 1: Conectar al servidor y actualizar codigo

```bash
ssh usuario@servidor
cd ~/lab-automation
git pull origin main
```

### Paso 2: Migrar la DB (ejecutar UNA sola vez)

> Esto modifica la DB en caliente. No requiere downtime ni wipe.

```bash
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c "
-- 2a. Agregar columna tipo a metas_seccion
ALTER TABLE tiempos_entrega.metas_seccion
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'INMUNOXXI';

-- 2b. Clasificar secciones referidas
UPDATE tiempos_entrega.metas_seccion SET tipo = 'REFERIDO'
WHERE seccion IN (
    'PRUEBAS ESPECIALES 3-MP',
    'PRUEBAS ESPECIALES 2-SL',
    'QUEST DIAGNOSTICS',
    'MAYO MEDICAL LAB',
    'UNIDIN',
    'INMUNODIAGNOSTICO 2',
    'EXAMINA'
);

-- 2c. Actualizar metas incorrectas
UPDATE tiempos_entrega.metas_seccion SET meta_dias = 3.0  WHERE seccion = 'HEMOSTASIA Y TROMBOSIS';
UPDATE tiempos_entrega.metas_seccion SET meta_dias = 3.0  WHERE seccion = 'PRUEBAS ESPECIALES';
UPDATE tiempos_entrega.metas_seccion SET meta_dias = 3.0  WHERE seccion = 'LIQUIDO SINOVIAL';
UPDATE tiempos_entrega.metas_seccion SET meta_dias = 7.0  WHERE seccion = 'BIOLOGIA MOLECULAR';
UPDATE tiempos_entrega.metas_seccion SET meta_dias = 5.0  WHERE seccion = 'INMUNODIAGNOSTICO 2';
"
```

### Paso 3: Drop vistas viejas

> Necesario porque las vistas cambiaron su lista de columnas (se agrego `tipo`).
> `CREATE OR REPLACE VIEW` de PostgreSQL no permite reordenar/agregar columnas.

```bash
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c "
DROP VIEW IF EXISTS tiempos_entrega.v_resumen_global CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_fases_seccion CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_promedio_acumulado CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_portafolio_seccion CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_examenes_seccion CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_tendencia_anual CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_reporte_mensual CASCADE;
"
```

### Paso 4: Rebuild y restart del backend

> El backend aplica las vistas nuevas automaticamente al arrancar.

```bash
docker compose up -d --build backend
```

### Paso 5: Verificar vistas

```bash
# Verificar que apply-views funciono
docker compose logs backend --tail=5
# Debe decir: "[apply-views] Views applied successfully from /app/db-views/views.sql"

# Verificar eficacia (ya no debe ser NULL ni SIN META)
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c \
  "SELECT seccion, tipo, meta_dias, eficacia, estado_eficacia FROM tiempos_entrega.v_reporte_mensual LIMIT 5;"

# Verificar metas y tipos
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c \
  "SELECT seccion, meta_dias, tipo FROM tiempos_entrega.metas_seccion ORDER BY tipo, seccion;"

# Verificar vista global nueva
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c \
  "SELECT * FROM tiempos_entrega.v_resumen_global;"
```

### Paso 6: Importar dashboard de Metabase

> Crea automaticamente la coleccion, las 7 preguntas y el dashboard con su layout.
> Ubuntu ya tiene python3 preinstalado — no hay que instalar nada.

```bash
cd ~/lab-automation
python3 scripts/import-metabase.py https://lab-dashboard.boheforge.dev TU_EMAIL TU_PASSWORD
```

Reemplazar `TU_EMAIL` y `TU_PASSWORD` con las credenciales de tu cuenta admin de Metabase en produccion.

El script imprime el link al dashboard al terminar. Abrirlo y verificar que:
- Las 7 preguntas se ven con datos
- Los filtros funcionan
- El formato condicional (colores) se mantiene

> **Nota:** Si Metabase en produccion tiene un nombre de base de datos diferente a "Lab Tiempos",
> el script busca cualquier base que contenga "lab" o "tiempos" en el nombre.

---

## Documentacion

| Archivo | Para quien | Que contiene |
|---|---|---|
| `docs/METABASE-GUIA.md` | Admin (setup) | Crear preguntas y dashboard paso a paso (manual) |
| `docs/MANUAL-CARGA-DATOS.md` | Usuario final | Subir archivo mensual y verificar en Metabase |
| `docs/CHANGELOG-VISTAS-2026-03.md` | Admin (deploy) | Este archivo — pasos de migracion a produccion |

---

## Rollback (si algo sale mal)

### Revertir codigo y vistas

```bash
cd ~/lab-automation
git checkout HEAD~1 -- db-views/views.sql db-init/01-schema.sql backend/src/apply-views.ts

docker exec lab-postgres psql -U labadmin -d lab_tiempos -c "
DROP VIEW IF EXISTS tiempos_entrega.v_resumen_global CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_fases_seccion CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_promedio_acumulado CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_portafolio_seccion CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_examenes_seccion CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_tendencia_anual CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_reporte_mensual CASCADE;
"

docker compose up -d --build backend
```

### Revertir metas (valores originales)

```bash
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c "
UPDATE tiempos_entrega.metas_seccion SET meta_dias = 0.5  WHERE seccion = 'HEMOSTASIA Y TROMBOSIS';
UPDATE tiempos_entrega.metas_seccion SET meta_dias = 5.0  WHERE seccion = 'PRUEBAS ESPECIALES';
UPDATE tiempos_entrega.metas_seccion SET meta_dias = 5.0  WHERE seccion = 'LIQUIDO SINOVIAL';
UPDATE tiempos_entrega.metas_seccion SET meta_dias = 10.0 WHERE seccion = 'BIOLOGIA MOLECULAR';
UPDATE tiempos_entrega.metas_seccion SET meta_dias = 7.0  WHERE seccion = 'INMUNODIAGNOSTICO 2';
"
```

### Revertir dashboard de Metabase

Ir a Metabase > coleccion "Tiempos de Entrega" > borrar las preguntas y el dashboard manualmente, o eliminar la coleccion completa.
