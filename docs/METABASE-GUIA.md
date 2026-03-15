# Metabase - Guia de Conexion y Dashboards

## Laboratorio InmunoXXI - Tiempos de Entrega

---

## Paso 1: Acceder a Metabase

1. Abrir `http://servidor:3000` en el navegador
2. En el primer acceso, Metabase pide crear una cuenta de administrador
3. Completar nombre, email y contrasena

---

## Paso 2: Conectar a PostgreSQL

Durante el setup inicial (o en Admin > Databases > Add database):

| Campo    | Valor                          |
|----------|--------------------------------|
| Type     | PostgreSQL                     |
| Name     | Lab InmunoXXI                  |
| Host     | `postgres`                     |
| Port     | `5432`                         |
| Database | `lab_tiempos`                  |
| Username | `labadmin`                     |
| Password | (la del .env)                  |

Marcar **"Automatically run queries when doing simple filtering and summarizing"**.

Click en **Save**.

> **Nota:** El host es `postgres` (nombre del servicio Docker), no `localhost`,
> porque Metabase corre dentro de la misma red Docker.

---

## Paso 3: Verificar las vistas

Ir a **New > SQL query** y ejecutar:

```sql
SELECT table_name FROM information_schema.views
WHERE table_schema = 'tiempos_entrega';
```

Deberias ver las 5 vistas:
- `v_reporte_mensual`
- `v_tendencia_anual`
- `v_examenes_seccion`
- `v_portafolio_seccion`
- `v_promedio_acumulado`

---

## Paso 4: Crear las Preguntas (Queries)

Para cada dashboard, crear una "Question" en Metabase:

### Pregunta 1: Reporte Mensual

**New > SQL query:**

```sql
SELECT * FROM tiempos_entrega.v_reporte_mensual
ORDER BY fecha_inicio DESC, seccion
```

- Guardar como: **"Reporte Mensual"**
- Visualizacion: Tabla
- Formato condicional en `estado_eficacia`:
  - CUMPLE = verde
  - ALERTA = amarillo
  - NO CUMPLE = rojo
  - SIN META = gris

**Columnas importantes:**

| Columna | Que es |
|---------|--------|
| seccion | Nombre de la seccion del laboratorio |
| total_examenes | Examenes procesados ese mes |
| ingreso_impresion_dias | **Tiempo total de entrega** (dias) |
| meta_dias | Meta objetivo en dias |
| eficacia | meta / tiempo real (>1 = cumple) |
| estado_eficacia | CUMPLE / ALERTA / NO CUMPLE / SIN META |

---

### Pregunta 2: Tendencia por Seccion

```sql
SELECT * FROM tiempos_entrega.v_tendencia_anual
ORDER BY fecha_inicio, seccion
```

- Guardar como: **"Tendencia Anual"**
- Visualizacion: Grafico de lineas
  - Eje X: `fecha_inicio`
  - Eje Y: `dias_entrega`
  - Color/Serie: `seccion`

---

### Pregunta 3: Portafolio por Seccion

```sql
SELECT * FROM tiempos_entrega.v_portafolio_seccion
ORDER BY fecha_inicio DESC, seccion_padre
```

- Guardar como: **"Portafolio por Seccion"**
- Visualizacion: Tabla con formato condicional en `estado_tolerancia`
  - EN RANGO = verde
  - ALERTA = amarillo
  - ALARMA = naranja
  - CRITICO = rojo

**Columnas importantes:**

| Columna | Que es |
|---------|--------|
| total_pruebas_portafolio | Total examenes en esa seccion |
| pruebas_fuera_meta | Examenes que excedieron la meta |
| pct_fuera_meta | Porcentaje fuera de meta (0.05 = 5%) |
| estado_tolerancia | EN RANGO / ALERTA / ALARMA / CRITICO |

---

### Pregunta 4: Promedio Acumulado Anual

```sql
SELECT * FROM tiempos_entrega.v_promedio_acumulado
ORDER BY anio DESC, seccion
```

- Guardar como: **"Promedio Acumulado"**
- Visualizacion: Tabla
- Columnas clave: `seccion`, `promedio_acumulado_dias`, `eficacia_acumulada`, `estado_acumulado`, `meses_procesados`

---

### Pregunta 5: Examenes Fuera de Meta

```sql
SELECT * FROM tiempos_entrega.v_examenes_seccion
WHERE excede_meta = true
ORDER BY fecha_inicio DESC, diferencia_dias ASC
```

- Guardar como: **"Examenes Fuera de Meta"**
- Visualizacion: Tabla
- Los valores mas negativos en `diferencia_dias` son los peores

**Columnas importantes:**

| Columna | Que es |
|---------|--------|
| seccion_padre | Seccion a la que pertenece el examen |
| examen | Nombre del examen individual |
| dias_entrega | Tiempo total de entrega |
| meta_dias | Meta de la seccion |
| diferencia_dias | Positivo = dentro de meta, Negativo = excedio |

---

## Paso 5: Crear el Dashboard

1. **New > Dashboard**
2. Nombre: **"Tiempos de Entrega"**
3. Click en el icono de lapiz (editar)
4. Agregar las 5 preguntas creadas al dashboard
5. Agregar filtros:
   - **Anio**: conectar al campo `anio` de todas las preguntas
   - **Mes**: conectar al campo `mes`
   - **Seccion**: conectar a `seccion` o `seccion_padre`
6. Organizar el layout arrastrando las tarjetas
7. Guardar

---

## Paso 6: Configurar acceso (opcional)

### Crear usuarios adicionales
Admin > People > Add someone

### Compartir dashboard
- Click en el icono de compartir del dashboard
- Activar "Public sharing" para generar un link sin login
- O crear "Subscriptions" para enviar el dashboard por email periodicamente

### Refresh automatico
- En el dashboard, click en el reloj (esquina superior)
- Seleccionar intervalo: 1 min, 5 min, 15 min, etc.

---

## Notas

- **Actualizar datos:** Los datos se actualizan en tiempo real cuando se suben archivos por el portal. Metabase los muestra al refrescar la pregunta o con auto-refresh activado.
- **Si no ves datos:** Verifica que los contenedores Docker esten corriendo (`docker ps`) y que hayas subido archivos por el portal.
- **Las metas se configuran** en la tabla `metas_seccion`. Cambios se reflejan inmediatamente en Metabase.
- **Metabase usa H2 embebido** para su metadata interna. Los datos del lab siempre estan en PostgreSQL.
