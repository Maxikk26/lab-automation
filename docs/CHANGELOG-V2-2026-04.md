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
6. **Limpieza de espacios en codigos de examen** — Enterprise exporta codigos con padding (`"3999           -Contaje Celular"`). La migracion normaliza a `"3999-Contaje Celular"` tanto en `tiempos_examen` como en `examenes_excluidos`.

### Vistas — Reestructura completa

7. **Eliminadas definitivamente:** `v_resumen_global`, `v_reporte_mensual`, `v_tendencia_anual`, `v_examenes_seccion`, `v_promedio_acumulado`. No tenían utilidad en el flujo de análisis real.
8. **`v_examenes_cumplimiento`** (nueva, prioridad #1) — una fila por examen/mes. Semáforo CUMPLE/ALERTA/CRITICO con umbrales de días absolutos desde `config_tolerancias`. Excluye sub-componentes via `examenes_excluidos`.
9. **`v_fases_seccion`** (reescrita) — una fila por sección/mes. Fases renombradas (`procesamiento_dias`, `validacion_dias`, `impresion_dias`, `total_dias`). Meta usa COALESCE(override mensual → default sección). Incluye eficacia y cuello de botella.
10. **`v_portafolio_seccion`** (reescrita) — agrega exámenes por sección/mes. 3 niveles: EN RANGO/ALERTA/CRITICO. Umbrales desde `config_tolerancias`. Excluye sub-componentes.
11. **Fix match de exclusiones en vistas** — el JOIN de exclusiones usaba `LIKE codigo || '-%'` que fallaba con codigos con espacios. Ahora usa `TRIM(SPLIT_PART(examen, '-', 1)) = codigo_examen` (match exacto por codigo numerico).

### Backend — Nuevas rutas

12. **`/api/portal/metas`** — lista metas default + overrides por año.
13. **`/api/portal/admin/metas/default`** — actualiza meta global de una sección.
14. **`/api/portal/admin/metas/periodo`** — crea/actualiza override mensual (POST) y elimina override (POST /delete).
15. **`/api/portal/examenes/catalogo`** — lista todos los examenes en DB con flag `excluido` (para UI de seleccion).
16. **`/api/portal/exclusiones`** — lista exámenes excluidos.
17. **`/api/portal/admin/exclusiones/save`** / **`/delete`** — gestión de exclusiones. Ahora aceptan arrays (batch de hasta 100/200 items por chunk, idempotente).
18. **`/api/portal/tolerancias`** — lista configuraciones de tolerancias.
19. **`/api/portal/admin/tolerancias/save`** — crea/actualiza configuración de umbrales.
20. **`requirePermission`** middleware — valida `puede_editar_metas` o `puede_editar_examenes` en DB para usuarios no-admin.
21. **Login** — retorna permisos agregados (`puede_editar_metas`, `puede_editar_examenes`) en la respuesta.

### Portal — Nuevas páginas

22. **`/admin/metas`** — tabla editable de metas default + overrides mensuales por año. Click en celda para editar, vacío para heredar del default. Auto-save on blur con flash de feedback (sin botones de guardar).
23. **`/admin/exclusiones`** — reescrita: catalogo de examenes por seccion con toggle excluir/incluir en batch. Ya no es un formulario manual de codigo+nombre.
24. **`/admin/tolerancias`** — edición de umbrales de semáforo (global + por periodo).
25. **Sidebar** — nueva sección "Config. T. de Entrega" visible según permisos del usuario.
26. **AdminUsersPage** — checkboxes por automatización: `Cargar` / `Editar Metas` / `Editar Examenes`.
27. **HomePage** — corregido texto "Power BI" → "Metabase".

### n8n Workflows — Fix de parsing

28. **Limpieza de nombres de examen** — los 3 workflows (seccion, global, unificado) ahora aplican `.replace(/\s+-/, '-')` al parsear nombres de examen, eliminando espacios antes del guion que Enterprise inserta como padding.

---

## Archivos Modificados / Nuevos

| Archivo | Cambio |
|---|---|
| `db-init/01-schema.sql` | Nuevas tablas (`metas_periodo`, `examenes_excluidos`, `config_tolerancias`) + metas 2026 corregidas |
| `db-init/02-migrations.sql` | **NUEVO** — migración idempotente para bases existentes + limpieza de espacios en codigos de examen |
| `db-init/03-portal.sql` | Columnas `puede_editar_metas` / `puede_editar_examenes` en `usuario_automatizacion` |
| `db-views/views.sql` | Reescritura completa — 5 vistas eliminadas, 3 vistas nuevas/reescritas. Fix JOIN exclusiones (match exacto por codigo) |
| `backend/src/index.ts` | Registra rutas metas, exclusiones, tolerancias |
| `backend/src/auth.ts` | Nuevo middleware `requirePermission` |
| `backend/src/routes/login.ts` | Retorna permisos agregados en respuesta de login |
| `backend/src/routes/usuarios.ts` | CRUD de usuarios gestiona `puede_editar_metas` / `puede_editar_examenes` |
| `backend/src/routes/metas.ts` | **NUEVO** |
| `backend/src/routes/exclusiones.ts` | **NUEVO** — catalogo de examenes + CRUD batch de exclusiones |
| `backend/src/routes/tolerancias.ts` | **NUEVO** |
| `portal/src/App.tsx` | Rutas `/admin/metas`, `/admin/exclusiones`, `/admin/tolerancias` |
| `portal/src/components/Sidebar.tsx` | Sección "Config. T. de Entrega" con links según permisos |
| `portal/src/context/AuthContext.tsx` | `canEditMetas`, `canEditExamenes`, `canAccessAdmin` |
| `portal/src/pages/MetasPage.tsx` | **NUEVO** — auto-save on blur, flash feedback |
| `portal/src/pages/ExclusionesPage.tsx` | **NUEVO** — catalogo con toggle excluir/incluir en batch |
| `portal/src/pages/ToleranciasPage.tsx` | **NUEVO** |
| `portal/src/pages/AdminUsersPage.tsx` | Checkboxes de permisos granulares por automatización |
| `portal/src/pages/HomePage.tsx` | Texto "Power BI" → "Metabase" |
| `portal/src/api.ts` | Funciones: fetchMetas, saveMetaDefault, saveMetaPeriodo, deleteMetaPeriodo, fetchExamenesCatalogo, fetchExclusiones, saveExclusion (batch), deleteExclusion (batch), fetchTolerancias, saveTolerancia |
| `portal/src/types/index.ts` | Tipos: MetaSeccion, MetaPeriodo, ExamenExcluido, ConfigTolerancia, AutomatizacionPermission |
| `n8n/workflows/webhook-seccion.json` | Fix: limpia espacios en nombres de examen (`.replace(/\s+-/, '-')`) |
| `n8n/workflows/webhook-global.json` | Fix: limpia espacios en nombres de examen |
| `n8n/workflows/webhook-unificado.json` | Fix: limpia espacios en nombres de examen |

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
docker cp db-init/02-migrations.sql lab-postgres:/tmp/02-migrations.sql
docker exec lab-postgres psql -U labadmin -d lab_tiempos -f /tmp/02-migrations.sql
```

Lo que hace este script:
- Crea `metas_periodo`, `examenes_excluidos`, `config_tolerancias` (con seed default de tolerancias)
- Actualiza metas: HyT 5d, HEMATOLOGÍA 1d, UROANÁLISIS 1d, QUÍMICA 1d, BIOLOGIA MOLECULAR 9d
- Limpia espacios en codigos de examen en `tiempos_examen` y `examenes_excluidos`
- Agrega columnas `puede_editar_metas` / `puede_editar_examenes` a `usuario_automatizacion`

### Paso 3: Verificar migracion

```bash
# Verificar nuevas tablas
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c \
  "\dt tiempos_entrega.*"

# Verificar columnas de permisos en portal_config
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c \
  "\d portal_config.usuario_automatizacion"
# Debe mostrar: puede_cargar, puede_editar_metas, puede_editar_examenes
```

### Paso 4: Rebuild backend y portal

> El backend aplica las vistas nuevas automaticamente al arrancar.
> Las vistas anteriores (v_resumen_global, v_reporte_mensual, v_tendencia_anual,
> v_examenes_seccion, v_promedio_acumulado) seran eliminadas automaticamente.

```bash
docker compose up -d --build backend portal
```

### Paso 5: Verificar backend y vistas

```bash
# Backend arranco y aplico vistas
docker compose logs backend --tail=10
# Debe decir: "[apply-views] Views applied successfully"

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

### Paso 6: Actualizar workflows de n8n

Los 3 workflows tienen un fix que limpia espacios en nombres de examen al parsear los .xls.
Sin esto, la data nueva seguira entrando con espacios.

1. Abrir n8n (`https://n8n.boheforge.dev`)
2. Para cada workflow (`Tiempos Seccion`, `Tiempos Global`, `Tiempos Unificado`):
   - Desactivar el workflow
   - Eliminar el workflow existente
   - Importar el JSON actualizado desde `n8n/workflows/`
   - Verificar que la credencial **"Lab PostgreSQL"** este asignada al nodo "Guardar en BD"
   - Activar el workflow
3. Probar subiendo un archivo de prueba desde el portal

> **Alternativa rapida (si n8n tiene API habilitada):**
> Puedes sobrescribir directamente en la DB de n8n, pero la via segura es reimportar manualmente.

### Paso 7: Actualizar Metabase

Las 5 vistas eliminadas dejan de existir — cualquier pregunta/dashboard de Metabase que las use dara error.

Acciones necesarias en Metabase:
- Sincronizar el schema: Admin > Databases > Lab Tiempos > **Sync database schema now**
- Eliminar o actualizar preguntas que usen: `v_resumen_global`, `v_reporte_mensual`, `v_tendencia_anual`, `v_examenes_seccion`, `v_promedio_acumulado`
- Crear nuevas preguntas sobre: `v_examenes_cumplimiento`, `v_fases_seccion`, `v_portafolio_seccion`
- En Admin > Data Model, configurar columna `seccion` como **Field Type = Category** en las 3 vistas (para filtros de dashboard)

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
> Los workflows de n8n se pueden reimportar desde el commit anterior.

```bash
cd ~/lab-automation

# 1. Revertir codigo
git checkout HEAD~1 -- db-views/views.sql backend/src/ portal/src/ n8n/workflows/

# 2. Dropear vistas nuevas para que el backend recree las viejas
docker exec lab-postgres psql -U labadmin -d lab_tiempos -c "
DROP VIEW IF EXISTS tiempos_entrega.v_examenes_cumplimiento CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_fases_seccion CASCADE;
DROP VIEW IF EXISTS tiempos_entrega.v_portafolio_seccion CASCADE;
"

# 3. Rebuild
docker compose up -d --build backend portal

# 4. Reimportar workflows anteriores en n8n (mismos pasos del Paso 6 pero con los JSONs revertidos)
```
