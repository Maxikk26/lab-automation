# Control de Cambios — Dashboard V2 + Metas/Exclusiones/Tolerancias

**Fecha:** 2026-04-06
**Ambiente probado:** Local (Docker Desktop, Windows 11)
**Aplica a:** Produccion (Ubuntu Server)

---

## Resumen de Cambios

### Base de datos — Nuevas tablas

1. **`metas_periodo`** — overrides de meta por sección/mes/año. Permite cambiar la meta de un mes específico sin afectar el histórico ni el default global.
2. **`examenes_excluidos`** — lista de códigos de examen que son sub-componentes y no deben contar en el portafolio (ej: sub-paneles que Enterprise reporta como exámenes independientes pero no lo son).
3. **`config_tolerancias`** — umbrales parametrizables por periodo (o default global) para semáforos de portafolio (% fuera de meta) y de exámenes (días absolutos).

### Base de datos — Migraciones a tablas existentes

4. **`metas_seccion`** — metas 2026 corregidas: HyT 3→5, HEMATOLOGÍA 0.5→1, UROANÁLISIS 0.5→1, QUÍMICA 0.5→1, BIOLOGIA MOLECULAR 7→9 días.
5. **`usuario_automatizacion`** — nuevas columnas `puede_editar_metas` y `puede_editar_examenes` (permisos granulares por automatización).

### Vistas — Reestructura completa

6. **Eliminadas definitivamente:** `v_resumen_global`, `v_reporte_mensual`, `v_tendencia_anual`, `v_examenes_seccion`, `v_promedio_acumulado`. No tenían utilidad en el flujo de análisis real.
7. **`v_examenes_cumplimiento`** (nueva, prioridad #1) — una fila por examen/mes. Semáforo CUMPLE/ALERTA/CRITICO con umbrales de días absolutos desde `config_tolerancias`. Excluye sub-componentes via `examenes_excluidos`.
8. **`v_fases_seccion`** (reescrita) — una fila por sección/mes. Fases renombradas (`procesamiento_dias`, `validacion_dias`, `impresion_dias`, `total_dias`). Meta usa COALESCE(override mensual → default sección). Incluye eficacia y cuello de botella.
9. **`v_portafolio_seccion`** (reescrita) — agrega exámenes por sección/mes. 3 niveles: EN RANGO/ALERTA/CRITICO. Umbrales desde `config_tolerancias`. Excluye sub-componentes.

### Backend — Nuevas rutas

10. **`/api/portal/metas`** — lista metas default + overrides por año.
11. **`/api/portal/admin/metas/default`** — actualiza meta global de una sección.
12. **`/api/portal/admin/metas/periodo`** — crea/actualiza override mensual (POST) y elimina override (POST /delete).
13. **`/api/portal/exclusiones`** — lista exámenes excluidos.
14. **`/api/portal/admin/exclusiones/save`** / **`/delete`** — gestión de exclusiones.
15. **`/api/portal/tolerancias`** — lista configuraciones de tolerancias.
16. **`/api/portal/admin/tolerancias/save`** — crea/actualiza configuración de umbrales.
17. **`requirePermission`** middleware — valida `puede_editar_metas` o `puede_editar_examenes` en DB para usuarios no-admin.
18. **Login** — retorna permisos agregados (`puede_editar_metas`, `puede_editar_examenes`) en la respuesta.

### Portal — Nuevas páginas

19. **`/admin/metas`** — tabla editable de metas default + overrides mensuales por año. Click en celda para editar, vacío para heredar del default.
20. **`/admin/exclusiones`** — CRUD de exámenes excluidos del portafolio.
21. **`/admin/tolerancias`** — edición de umbrales de semáforo (global + por periodo).
22. **Sidebar** — nueva sección "Config. T. de Entrega" visible según permisos del usuario.
23. **AdminUsersPage** — checkboxes por automatización: `Cargar` / `Editar Metas` / `Editar Examenes`.

---

## Archivos Modificados / Nuevos

| Archivo | Cambio |
|---|---|
| `db-init/01-schema.sql` | Nuevas tablas (`metas_periodo`, `examenes_excluidos`, `config_tolerancias`) + metas 2026 corregidas |
| `db-init/02-migrations.sql` | **NUEVO** — migración idempotente para bases existentes |
| `db-init/03-portal.sql` | Columnas `puede_editar_metas` / `puede_editar_examenes` en `usuario_automatizacion` |
| `db-views/views.sql` | Reescritura completa — 5 vistas eliminadas, 3 vistas nuevas/reescritas |
| `backend/src/index.ts` | Registra rutas metas, exclusiones, tolerancias |
| `backend/src/auth.ts` | Nuevo middleware `requirePermission` |
| `backend/src/routes/login.ts` | Retorna permisos agregados en respuesta de login |
| `backend/src/routes/usuarios.ts` | CRUD de usuarios gestiona `puede_editar_metas` / `puede_editar_examenes` |
| `backend/src/routes/metas.ts` | **NUEVO** |
| `backend/src/routes/exclusiones.ts` | **NUEVO** |
| `backend/src/routes/tolerancias.ts` | **NUEVO** |
| `portal/src/App.tsx` | Rutas `/admin/metas`, `/admin/exclusiones`, `/admin/tolerancias` |
| `portal/src/components/Sidebar.tsx` | Sección "Config. T. de Entrega" con links según permisos |
| `portal/src/context/AuthContext.tsx` | `canEditMetas`, `canEditExamenes`, `canAccessAdmin` |
| `portal/src/pages/MetasPage.tsx` | **NUEVO** |
| `portal/src/pages/ExclusionesPage.tsx` | **NUEVO** |
| `portal/src/pages/ToleranciasPage.tsx` | **NUEVO** |
| `portal/src/pages/AdminUsersPage.tsx` | Checkboxes de permisos granulares por automatización |
| `portal/src/api.ts` | Funciones: fetchMetas, saveMetaDefault, saveMetaPeriodo, deleteMetaPeriodo, fetchExclusiones, saveExclusion, deleteExclusion, fetchTolerancias, saveTolerancia |
| `portal/src/types/index.ts` | Tipos: MetaSeccion, MetaPeriodo, ExamenExcluido, ConfigTolerancia, AutomatizacionPermission |

---

## Pasos para Replicar en Produccion

### Pre-requisitos

- Acceso SSH al servidor Ubuntu
- Repo actualizado (`git pull`)
- La DB de produccion ya existe (no es una instalacion nueva)

### Paso 1: Actualizar codigo

```bash
ssh usuario@servidor
cd ~/lab-automation
git pull origin main
```

### Paso 2: Migrar la DB (ejecutar UNA sola vez)

> `02-migrations.sql` es idempotente (usa `IF NOT EXISTS`, guards condicionales).
> Seguro ejecutarlo en caliente, no requiere downtime.

```bash
docker exec lab-postgres psql -U labadmin -d lab_tiempos \
  -f /docker-entrypoint-initdb.d/02-migrations.sql
```

> Si el archivo no esta montado en el contenedor, copiarlo primero:
>
> ```bash
> docker cp db-init/02-migrations.sql lab-postgres:/tmp/02-migrations.sql
> docker exec lab-postgres psql -U labadmin -d lab_tiempos -f /tmp/02-migrations.sql
> ```

Lo que hace este script:
- Crea `metas_periodo`, `examenes_excluidos`, `config_tolerancias` (con seed default de tolerancias)
- Actualiza metas: HyT 5d, HEMATOLOGÍA 1d, UROANÁLISIS 1d, QUÍMICA 1d, BIOLOGIA MOLECULAR 9d
- Agrega columnas `puede_editar_metas` / `puede_editar_examenes` a `usuario_automatizacion`

### Paso 3: Agregar columnas al esquema portal_config (si no lo hizo el paso 2)

> El paso 2 ya incluye esto via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
> Verificar con:

```bash
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c \
  "\d portal_config.usuario_automatizacion"
```

Debe mostrar las columnas `puede_cargar`, `puede_editar_metas`, `puede_editar_examenes`.

### Paso 4: Rebuild y restart

> El backend aplica las vistas nuevas automaticamente al arrancar.
> Las vistas anteriores (v_resumen_global, v_reporte_mensual, v_tendencia_anual,
> v_examenes_seccion, v_promedio_acumulado) seran eliminadas automaticamente.

```bash
docker compose up -d --build backend portal
```

### Paso 5: Verificar

```bash
# Backend arranco y aplico vistas
docker compose logs backend --tail=10
# Debe decir: "[apply-views] Views applied successfully"

# Verificar nuevas tablas
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c \
  "\dt tiempos_entrega.*"

# Verificar vistas activas (deben existir solo 3)
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c \
  "SELECT viewname FROM pg_views WHERE schemaname = 'tiempos_entrega' ORDER BY viewname;"
# Esperado: v_examenes_cumplimiento, v_fases_seccion, v_portafolio_seccion

# Verificar metas corregidas
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c \
  "SELECT seccion, meta_dias FROM tiempos_entrega.metas_seccion ORDER BY seccion;"

# Verificar tolerancias default
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c \
  "SELECT * FROM tiempos_entrega.config_tolerancias;"

# Smoke test de vistas
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c \
  "SELECT anio, mes, seccion, total_dias, meta_dias, estado FROM tiempos_entrega.v_fases_seccion LIMIT 5;"
```

### Paso 6: Actualizar Metabase

Las 5 vistas eliminadas dejan de existir — cualquier pregunta/dashboard de Metabase que las use dara error.

Acciones necesarias en Metabase:
- Eliminar o actualizar preguntas que usen: `v_resumen_global`, `v_reporte_mensual`, `v_tendencia_anual`, `v_examenes_seccion`, `v_promedio_acumulado`
- Crear nuevas preguntas sobre: `v_examenes_cumplimiento`, `v_fases_seccion`, `v_portafolio_seccion`
- Sincronizar el schema en Metabase: Admin > Databases > Lab Tiempos > Sync database schema

---

## Impacto en Metabase

| Vista anterior | Estado | Reemplazada por |
|---|---|---|
| `v_examenes_seccion` | Eliminada | `v_examenes_cumplimiento` |
| `v_reporte_mensual` | Eliminada | `v_fases_seccion` |
| `v_portafolio_seccion` | Reescrita (misma tabla) | `v_portafolio_seccion` (misma, columnas cambiaron) |
| `v_fases_seccion` | Reescrita (misma tabla) | `v_fases_seccion` (misma, columnas cambiaron) |
| `v_resumen_global` | Eliminada | — (no reemplazada, sin uso) |
| `v_tendencia_anual` | Eliminada | — (no reemplazada, sin uso) |
| `v_promedio_acumulado` | Eliminada | — (no reemplazada, sin uso) |

**Columnas cambiadas en vistas existentes:**

`v_fases_seccion`: `fase1_*` → `procesamiento_dias`, `fase2_*` → `validacion_dias`, `fase5_total` → `total_dias`. Se removio `fecha_inicio`/`fecha_fin`. Se agrego `eficacia`, `cuello_botella`, `pct_*`.

`v_portafolio_seccion`: Ahora usa tolerancias de `config_tolerancias`. Semaforo: EN RANGO / ALERTA / CRITICO (antes: verde/amarillo/rojo con % hardcodeados).

---

## Rollback

> Solo revertir codigo — las tablas nuevas no causan problemas si se dejan.
> Las columnas nuevas en `usuario_automatizacion` son opcionales (tienen DEFAULT).

```bash
cd ~/lab-automation
git checkout HEAD~1 -- db-views/views.sql backend/src/ portal/src/

# Dropear vistas nuevas para que el backend recree las viejas
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c "
DROP VIEW IF EXISTS tiempos_entrega.v_examenes_cumplimiento CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_fases_seccion CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_portafolio_seccion CASCADE;
"

docker compose up -d --build backend portal
```
