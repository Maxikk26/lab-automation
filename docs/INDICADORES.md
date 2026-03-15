# Indicadores Potenciales en la Data Existente

## Contexto

El archivo `data cruda.xls` exportado del sistema Enterprise contiene mas informacion
de la que actualmente se utiliza. Este documento identifica indicadores adicionales
que se pueden extraer sin necesidad de datos nuevos.

---

## Datos disponibles por cada seccion y examen

Cada registro tiene 5 fases de tiempo:

```
Ingreso --> Resultado --> Validacion --> Impresion
  |              |              |              |
  |-- Fase 1 ---|              |              |
  |              |-- Fase 2 ---|              |
  |-------- Fase 3 -----------|              |
  |                             |-- Fase 4 ---|
  |-------------- Fase 5 (TOTAL) -------------|
```

| Fase | Columna | Que mide |
|------|---------|----------|
| Fase 1 | Ingreso/Resultado | Tiempo de procesamiento tecnico |
| Fase 2 | Resultado/Validacion | Tiempo de espera para revision |
| Fase 3 | Ingreso/Validacion | Combinacion de Fase 1 + Fase 2 |
| Fase 4 | Validacion/Impresion | Tiempo de entrega al paciente |
| Fase 5 | Ingreso/Impresion | Tiempo total de entrega (usado para eficacia) |

**Actualmente solo usamos la Fase 5 para eficacia.** Las fases 1, 2 y 4 estan
almacenadas en la base de datos pero no se analizan.

---

## Indicadores propuestos

### 1. Cuello de botella por fase

**Pregunta:** En cual fase se pierde mas tiempo para cada seccion?

| Seccion | Fase 1 (Procesamiento) | Fase 2 (Validacion) | Fase 4 (Impresion) | Cuello de botella |
|---------|----------------------|--------------------|--------------------|-------------------|
| INMUNODIAGNOSTICO | 81:26 (44%) | 93:49 (51%) | 5:46 (3%) | Validacion |
| QUIMICA | 7:01 (61%) | 1:03 (9%) | 3:26 (30%) | Procesamiento |
| HEMATOLOGIA | 4:49 (48%) | 0:54 (9%) | 4:15 (43%) | Procesamiento |
| UROANALISIS | 24:01 (86%) | 1:20 (5%) | 2:27 (9%) | Procesamiento |

**Valor:** Saber si el problema es tecnico (Fase 1), de validador (Fase 2),
o logistico (Fase 4) cambia completamente las acciones correctivas.

**Dashboard sugerido:** Grafico de barras apiladas por seccion.

---

### 2. Distribucion de carga de trabajo

**Pregunta:** Como se distribuye el volumen de examenes entre secciones?

| Seccion | Examenes | % del Total |
|---------|----------|-------------|
| HEMATOLOGIA | 3,718 | 26.0% |
| QUIMICA | 3,165 | 22.1% |
| ETIQUETAS - HISTORIAL | 2,914 | 20.4% |
| INMUNODIAGNOSTICO | 1,563 | 10.9% |
| UROANALISIS | 1,326 | 9.3% |
| Otras 12 secciones | 1,633 | 11.4% |

3 secciones concentran el 68% del volumen total.

**Dashboard sugerido:** Grafico de torta o Pareto.

---

### 3. Relacion volumen vs. tiempo de entrega

**Pregunta:** Las secciones con mas examenes son mas lentas?

| Seccion | Volumen | Tiempo Total | Relacion |
|---------|---------|-------------|----------|
| HEMATOLOGIA | 3,718 | 9:58 | Alto volumen, rapido |
| QUIMICA | 3,165 | 11:29 | Alto volumen, rapido |
| INMUNODIAGNOSTICO | 1,563 | 184:09 | Medio volumen, muy lento |
| BIOLOGIA MOLECULAR | 194 | 202:34 | Bajo volumen, muy lento |

**Hallazgo:** Relacion inversa entre volumen y tiempo. Secciones de bajo volumen
tienden a ser mas lentas (examenes mas complejos, equipos con menor disponibilidad).

---

### 4. Deteccion de examenes outlier

**Pregunta:** Hay examenes con tiempos extremos que distorsionan los promedios?

Top 5 examenes mas lentos (datos de ejemplo):

| Examen | Cantidad | Tiempo Total |
|--------|----------|-------------|
| Myasthenia Gravis Evaluation | 1 | 763:56 (~32 dias) |
| Monoclonal Protein Study (Urine) | 1 | 722:51 (~30 dias) |
| Monoclonal Gammopathy (Serum) | 1 | 722:51 (~30 dias) |

Todos son examenes realizados 1 sola vez con tiempos extremos.

**Valor:** Separar problemas sistemicos de casos puntuales.

**Dashboard sugerido:** Tabla con flag de "outlier" cuando exceda 2x-3x el promedio.

---

### 5. Impacto ponderado (volumen x tiempo)

**Pregunta:** Donde mejorar para beneficiar a mas pacientes?

```
Impacto = Total examenes x Dias de entrega
```

| Seccion | Examenes | Dias | Impacto |
|---------|----------|------|---------|
| INMUNODIAGNOSTICO | 1,563 | 7.67 | 11,990 |
| BIOLOGIA MOLECULAR | 194 | 8.44 | 1,637 |
| UROANALISIS | 1,326 | 1.16 | 1,538 |

**Hallazgo:** INMUNODIAGNOSTICO tiene un impacto 8x mayor que cualquier otra seccion.

**Dashboard sugerido:** Grafico de burbujas (X=dias, Y=volumen, tamaño=impacto).

---

### 6. Eficiencia de Validacion (Fase 2)

**Pregunta:** Cuanto tiempo esperan los resultados para ser validados?

| Seccion | Resultado/Validacion | Interpretacion |
|---------|---------------------|----------------|
| INMUNODIAGNOSTICO | 93:49 (~4 dias) | Espera muy larga |
| PRUEBAS ESPECIALES 3-MP | 43:19 (~1.8 dias) | Espera alta |
| HEMATOLOGIA | 0:54 (~1 hora) | Excelente |
| QUIMICA | 1:03 (~1 hora) | Excelente |

**Hallazgo:** INMUNODIAGNOSTICO tiene resultados listos que esperan ~4 dias
para ser validados. Problema de flujo de trabajo, no tecnico.

---

### 7. Eficiencia de Impresion/Entrega (Fase 4)

**Pregunta:** Una vez validado, cuanto tarda en llegar al paciente?

| Seccion | Validacion/Impresion | Interpretacion |
|---------|---------------------|----------------|
| UNIDIN | 15:33 | Problema logistico serio |
| PRUEBAS ESPECIALES 3-MP | 7:07 | Demora alta |
| HEMATOLOGIA | 4:15 | Normal |
| ETIQUETAS - HISTORIAL | 0:00 | Instantaneo |

**Valor:** Tiempos altos en esta fase son puramente logisticos y los mas faciles de corregir.

---

### 8. Rendimiento por operador (no procesado aun)

El archivo `data cruda.xls` tiene un bloque adicional despues del "Total"
con datos por operador/bioanalista. Actualmente se descarta.

Si se procesa permitiria:
- Comparar rendimiento entre operadores
- Identificar necesidades de capacitacion
- Detectar si retrasos son sistemicos o de operadores especificos

**Requiere:** Modificar el workflow de n8n para procesar este bloque adicional.

**Nota:** Manejar con confidencialidad. Enfoque en mejora, no en penalizacion.

---

## Resumen

| # | Indicador | Ya tenemos los datos | Esfuerzo |
|---|-----------|---------------------|----------|
| 1 | Cuello de botella por fase | Si | Solo dashboard |
| 2 | Distribucion de carga | Si | Solo dashboard |
| 3 | Volumen vs. tiempo | Si | Solo dashboard |
| 4 | Examenes outlier | Si | Solo dashboard |
| 5 | Impacto ponderado | Si | Solo dashboard |
| 6 | Eficiencia de validacion | Si | Solo dashboard |
| 7 | Eficiencia de impresion | Si | Solo dashboard |
| 8 | Rendimiento por operador | No | Modificar workflow |

Los indicadores 1-7 se implementan creando nuevas preguntas/dashboards en Metabase
con la data que ya esta en PostgreSQL.
