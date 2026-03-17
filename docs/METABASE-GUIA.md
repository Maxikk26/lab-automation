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

## Paso 3: Sincronizar las vistas

Despues de conectar la base de datos:

1. Ir a **Admin (engranaje) > Databases > Lab InmunoXXI**
2. Click en **"Sync database schema now"**
3. Esperar 1-2 minutos
4. Verificar en **New > Question > Lab InmunoXXI > Tiempos Entrega** que aparezcan las 7 vistas:
   - V Reporte Mensual
   - V Tendencia Anual
   - V Examenes Seccion
   - V Portafolio Seccion
   - V Promedio Acumulado
   - V Fases Seccion
   - V Resumen Global

---

## Paso 4: Crear la coleccion

Organizar todo en una carpeta:

1. Click en **New > Collection**
2. Nombre: **"Tiempos de Entrega"**
3. Click **Create**

Todas las preguntas y dashboards que creemos van aqui.

---

## Paso 5: Crear las Preguntas (tarjetas del dashboard)

Cada "pregunta" es un grafico o tabla que luego agregaremos al dashboard.

### Pregunta 1: Reporte Mensual (tabla principal)

1. Click en **New > SQL query**
2. Seleccionar base de datos **Lab InmunoXXI**
3. Pegar este query:

```sql
SELECT
    anio AS "Año",
    mes AS "Mes",
    seccion AS "Seccion",
    tipo AS "Tipo",
    total_examenes AS "Total Examenes",
    ingreso_impresion_dias AS "Dias Entrega",
    meta_dias AS "Meta (dias)",
    eficacia AS "Eficacia",
    estado_eficacia AS "Estado"
FROM tiempos_entrega.v_reporte_mensual
ORDER BY fecha_inicio DESC, seccion
```

4. Click en el boton azul **"Get Answer"** (o Ctrl+Enter)
5. Verificar que la tabla muestra datos
6. Click en **"Visualization"** (abajo a la izquierda) → elegir **Table**
7. Click en **Save** → Nombre: **"Reporte Mensual"** → Coleccion: **Tiempos de Entrega** → Save

**Formato condicional (colores):**
1. Despues de guardar, click en **Visualization > Settings** (engranaje junto a la tabla)
2. Tab **"Conditional Formatting"**
3. Agregar regla:
   - Columna: **Estado**
   - Condicion: `is` → `CUMPLE` → Color: verde
4. Agregar otra regla: `is` → `ALERTA` → Color: amarillo
5. Agregar otra regla: `is` → `NO CUMPLE` → Color: rojo
6. Click **Done**

---

### Pregunta 2: Tendencia Anual (grafico de lineas)

1. **New > SQL query:**

```sql
SELECT
    fecha_inicio AS "Fecha",
    seccion AS "Seccion",
    tipo AS "Tipo",
    dias_entrega AS "Dias Entrega",
    meta_dias AS "Meta"
FROM tiempos_entrega.v_tendencia_anual
ORDER BY fecha_inicio, seccion
```

2. Click **Get Answer**
3. Click en **"Visualization"** → elegir **Line**
4. Configurar:
   - Eje X: **Fecha**
   - Eje Y: **Dias Entrega**
   - Series: **Seccion** (cada seccion sera una linea de diferente color)
5. **Save** → Nombre: **"Tendencia Anual"** → Coleccion: Tiempos de Entrega

---

### Pregunta 3: Eficacia por Seccion (grafico de barras)

1. **New > SQL query:**

```sql
SELECT
    seccion AS "Seccion",
    tipo AS "Tipo",
    eficacia AS "Eficacia",
    estado_eficacia AS "Estado"
FROM tiempos_entrega.v_reporte_mensual
WHERE eficacia IS NOT NULL
ORDER BY eficacia DESC
```

2. Click **Get Answer**
3. **Visualization** → **Bar**
4. Configurar:
   - Eje X: **Seccion**
   - Eje Y: **Eficacia**
5. En Settings (engranaje): agregar linea de referencia en Y = 1.0 (representa 100% de la meta)
6. **Save** → Nombre: **"Eficacia por Seccion"** → Coleccion: Tiempos de Entrega

---

### Pregunta 4: Portafolio — % Fuera de Meta (tabla con semaforo)

1. **New > SQL query:**

```sql
SELECT
    anio AS "Año",
    mes AS "Mes",
    seccion_padre AS "Seccion",
    tipo AS "Tipo",
    meta_dias AS "Meta (dias)",
    total_pruebas_portafolio AS "Total Pruebas",
    pruebas_fuera_meta AS "Fuera de Meta",
    ROUND(pct_fuera_meta * 100, 1) AS "% Fuera de Meta",
    estado_tolerancia AS "Estado"
FROM tiempos_entrega.v_portafolio_seccion
ORDER BY fecha_inicio DESC, seccion_padre
```

2. Click **Get Answer**
3. **Visualization** → **Table**
4. Formato condicional en **Estado**:
   - `EN RANGO` → verde
   - `ALERTA` → amarillo
   - `ALARMA` → naranja
   - `CRITICO` → rojo
5. **Save** → Nombre: **"Portafolio por Seccion"** → Coleccion: Tiempos de Entrega

---

### Pregunta 5: Promedio Acumulado Anual (tabla resumen)

1. **New > SQL query:**

```sql
SELECT
    seccion AS "Seccion",
    tipo AS "Tipo",
    anio AS "Año",
    meta_dias AS "Meta (dias)",
    meses_procesados AS "Meses Procesados",
    promedio_acumulado_dias AS "Promedio Acumulado (dias)",
    eficacia_acumulada AS "Eficacia Acumulada",
    estado_acumulado AS "Estado",
    desde AS "Desde",
    hasta AS "Hasta"
FROM tiempos_entrega.v_promedio_acumulado
ORDER BY anio DESC, seccion
```

2. Click **Get Answer**
3. **Visualization** → **Table**
4. Formato condicional en **Estado**:
   - `CUMPLE` → verde
   - `ALERTA` → amarillo
   - `NO CUMPLE` → rojo
5. **Save** → Nombre: **"Promedio Acumulado"** → Coleccion: Tiempos de Entrega

---

### Pregunta 6: Fases del Pipeline (tabla con cuello de botella)

1. **New > SQL query:**

```sql
SELECT
    anio AS "Año",
    mes AS "Mes",
    seccion AS "Seccion",
    tipo AS "Tipo",
    total_examenes AS "Total Examenes",
    fase1_procesamiento AS "Procesamiento (dias)",
    fase2_validacion AS "Validacion (dias)",
    fase4_impresion AS "Impresion (dias)",
    fase5_total AS "Total (dias)",
    meta_dias AS "Meta (dias)",
    eficacia AS "Eficacia",
    estado_eficacia AS "Estado",
    cuello_botella AS "Cuello de Botella"
FROM tiempos_entrega.v_fases_seccion
ORDER BY fecha_inicio DESC, seccion
```

2. Click **Get Answer**
3. **Visualization** → **Table**
4. Formato condicional en **Estado** (mismo patron verde/amarillo/rojo)
5. **Save** → Nombre: **"Fases del Pipeline"** → Coleccion: Tiempos de Entrega

---

### Pregunta 7: Examenes Fuera de Meta (detalle)

1. **New > SQL query:**

```sql
SELECT
    anio AS "Año",
    mes AS "Mes",
    seccion_padre AS "Seccion",
    tipo AS "Tipo",
    examen AS "Examen",
    dias_entrega AS "Dias Entrega",
    meta_dias AS "Meta (dias)",
    diferencia_dias AS "Diferencia"
FROM tiempos_entrega.v_examenes_seccion
WHERE excede_meta = true
ORDER BY fecha_inicio DESC, diferencia_dias ASC
```

2. Click **Get Answer**
3. **Visualization** → **Table**
4. **Save** → Nombre: **"Examenes Fuera de Meta"** → Coleccion: Tiempos de Entrega

> Los valores mas negativos en **Diferencia** son los que mas excedieron la meta.

---

### Pregunta 8: Resumen Global (totales mensuales)

1. **New > SQL query:**

```sql
SELECT
    anio AS "Año",
    mes AS "Mes",
    tipo AS "Tipo",
    total_examenes AS "Total Examenes",
    ingreso_impresion_dias AS "Dias Entrega (promedio ponderado)"
FROM tiempos_entrega.v_resumen_global
ORDER BY fecha_inicio DESC
```

2. Click **Get Answer**
3. **Visualization** → **Table**
4. **Save** → Nombre: **"Resumen Global"** → Coleccion: Tiempos de Entrega

---

## Paso 6: Crear el Dashboard

1. Ir a la coleccion **Tiempos de Entrega**
2. Click en **New > Dashboard**
3. Nombre: **"Tiempos de Entrega de Resultados"**
4. Coleccion: Tiempos de Entrega
5. Click **Create**

### Agregar las preguntas al dashboard

1. Click en el icono de **lapiz** (editar, esquina superior derecha)
2. Click en el boton **"+"** o en el icono de filtro/tarjeta
3. Seleccionar **"Existing question"**
4. Elegir de la coleccion cada pregunta creada y agregarla una por una

### Layout sugerido (de arriba a abajo)

```
+------------------------------------------+
|  Resumen Global (ancho completo)         |
+--------------------+---------------------+
|  Eficacia x Seccion|  Reporte Mensual    |
|  (barras)          |  (tabla)            |
+--------------------+---------------------+
|  Tendencia Anual (ancho completo)        |
+------------------------------------------+
|  Promedio Acumulado (ancho completo)     |
+--------------------+---------------------+
|  Portafolio        |  Fases Pipeline     |
+--------------------+---------------------+
|  Examenes Fuera de Meta (ancho completo) |
+------------------------------------------+
```

- Arrastra las tarjetas para organizarlas
- Ajusta el tamano arrastrando las esquinas

### Agregar filtros

1. En modo edicion, click en el icono de **filtro** (embudo, arriba)
2. Agregar filtro **"Tipo"**:
   - Click **"+ Filter"**
   - Tipo: **Text or Category**
   - Nombre: **Tipo**
   - Click en cada tarjeta del dashboard → conectar al campo **Tipo**
   - Valores por defecto: dejar vacio (muestra todo)
3. Agregar filtro **"Año"**:
   - Click **"+ Filter"**
   - Tipo: **Number**
   - Nombre: **Año**
   - Conectar al campo **Año** en cada tarjeta
4. Agregar filtro **"Mes"**:
   - Click **"+ Filter"**
   - Tipo: **Text or Category**
   - Nombre: **Mes**
   - Conectar al campo **Mes** en cada tarjeta
5. Agregar filtro **"Seccion"**:
   - Click **"+ Filter"**
   - Tipo: **Text or Category**
   - Nombre: **Seccion**
   - Conectar al campo **Seccion** en cada tarjeta

6. Click **Save** (boton azul, arriba a la derecha)

---

## Paso 7: Configurar acceso

### Crear usuarios para consulta

1. Ir a **Admin (engranaje) > People > + Add someone**
2. Ingresar nombre, email y contraseña
3. El usuario podra ver los dashboards pero no editarlos

### Compartir dashboard publicamente (opcional)

1. Abrir el dashboard
2. Click en el icono de **compartir** (flecha, arriba a la derecha)
3. Activar **"Public sharing"**
4. Copiar el link generado — cualquiera con el link puede ver el dashboard sin login

### Refresh automatico

1. En el dashboard, click en el icono del **reloj** (esquina superior derecha)
2. Seleccionar intervalo: 1 min, 5 min, 15 min, etc.
3. El dashboard se refrescara automaticamente

---

## Referencia de Vistas

| Vista | Que muestra | Uso principal |
|---|---|---|
| `v_reporte_mensual` | Dias y eficacia por seccion por mes | Tabla principal del reporte |
| `v_tendencia_anual` | Dias de entrega a lo largo del año | Grafico de lineas de tendencia |
| `v_examenes_seccion` | Detalle por examen individual | Identificar examenes problematicos |
| `v_portafolio_seccion` | % de pruebas fuera de meta por seccion | Semaforo de tolerancia |
| `v_promedio_acumulado` | Promedio anual acumulado + eficacia | Resumen ejecutivo anual |
| `v_fases_seccion` | 5 fases del pipeline + cuello de botella | Diagnostico de demoras |
| `v_resumen_global` | Total global ponderado por periodo | Indicador general del laboratorio |

---

## Notas

- **Actualizacion de datos:** Los datos se actualizan en tiempo real al subir archivos por el portal. Metabase los muestra al refrescar o con auto-refresh.
- **Filtro Tipo:** Usa `INMUNOXXI` para ver secciones propias del laboratorio, `REFERIDO` para secciones referidas a otros laboratorios.
- **Las metas se configuran** en la tabla `metas_seccion`. Cambios se reflejan inmediatamente.
- **Si no ves datos:** Verificar que los contenedores esten corriendo (`docker ps`) y que se hayan subido archivos.
