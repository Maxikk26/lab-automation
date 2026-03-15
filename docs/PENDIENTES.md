# Pendientes y Hallazgos Tecnicos

Decisiones abiertas y problemas conocidos del sistema.

---

## 1. Relacion Examen - Seccion

**Estado:** Pendiente de decision con el equipo del laboratorio.

### Problema

El archivo exportado del sistema Enterprise tiene dos bloques separados sin conexion:
- Bloque 1: Resumen por seccion con tiempos promedio agregados
- Bloque 2: Detalle por examen individual con tiempos

**No existe una columna que indique a cual seccion pertenece cada examen.**

Sin esta relacion no se puede responder: cuales examenes arrastran el tiempo de una seccion,
cual es el examen mas lento, que porcentaje cumple la meta, etc.

### Opciones

| Opcion | Esfuerzo | Precision | Descripcion |
|--------|----------|-----------|-------------|
| 1. Enterprise incluye seccion | Bajo | 100% | Si el sistema permite agregar la columna de seccion al reporte de detalle |
| 2. Tabla de mapeo manual | Medio | 100% | Crear tabla de referencia examen -> seccion (~482 examenes, una sola vez) |
| 3. Inferir por codigo | Medio | Por confirmar | Si los rangos de codigos (0001-0099, 1000-1999) corresponden a secciones |
| 4. Exportar por seccion | Alto | 100% | Exportar 17 archivos individuales en lugar de 1 |

**Recomendacion:** Opcion 1 > Opcion 3 > Opcion 2

**Nota:** La tabla `tiempos_examen` ya tiene el campo `seccion_padre` preparado (actualmente vacio).
No se requieren cambios de estructura en la BD.

**Preguntas para el equipo:**
- El sistema Enterprise permite personalizar las columnas del reporte?
- Los codigos de examen siguen un patron por seccion?
- Existe un catalogo maestro de examenes con sus codigos y secciones?

---

## 2. Calculo de Dias de Entrega

**Estado:** Resuelto - se adopto la formula precisa.

### Hallazgo

El Excel manual usaba una formula que descartaba los minutos:

```
Excel:     Dias = HORAS / 24            (descarta minutos)
Sistema:   Dias = (HORAS + MINUTOS/60) / 24  (preciso)
```

**Ejemplo:** `81:26` (81 horas, 26 minutos)
- Excel: 81 / 24 = 3.375 dias
- Sistema: (81 + 26/60) / 24 = 3.393 dias

### Impacto

| Seccion | Horas | Dias (Excel) | Dias (Sistema) | Diferencia |
|---------|-------|-------------|----------------|------------|
| HEMATOLOGIA | 9:58 | 0.375 | 0.415 | +0.040 (~58 min) |
| QUIMICA | 11:29 | 0.458 | 0.479 | +0.020 (~29 min) |
| INMUNDIAGNOSTICO | 184:09 | 7.667 | 7.673 | +0.006 (~9 min) |

La diferencia puede cambiar un "CUMPLE" a "NO CUMPLE" en meses con tiempos
justo en el limite de la meta, especialmente para secciones con metas cortas (0.5 dias).

**Decision:** Se adopto la formula precisa porque no descarta informacion y
refleja exactamente lo que reporta el sistema Enterprise.

### Nota adicional

2 de 17 secciones (QUEST DIAGNOSTICS, MAYO MEDICAL LAB) mostraron valores
diferentes entre la data cruda y el Excel de resultados, sugiriendo que
fueron generados en exportaciones distintas del Enterprise.

---

## 3. Setup Inicial del Servidor

**Estado:** Documentado en [DEPLOY-UBUNTU.md](DEPLOY-UBUNTU.md).

Checklist resumido:

- [ ] Instalar Docker y Docker Compose
- [ ] Clonar repo en prod/ y dev/
- [ ] Configurar .env con contraseñas seguras
- [ ] `docker compose up -d --build`
- [ ] Crear credencial "Lab PostgreSQL" en n8n
- [ ] Importar y activar los 3 workflows webhook
- [ ] Configurar Metabase (conexion a PostgreSQL + dashboards)
- [ ] Login al portal, cambiar contraseña del admin
- [ ] Crear usuarios y asignar automatizaciones
- [ ] Configurar backups diarios
- [ ] (Futuro) Configurar Cloudflare Tunnel

---

## 4. Datos de Operadores (no procesados)

**Estado:** Pendiente de decision.

El archivo `data cruda.xls` contiene un bloque adicional despues del "Total"
con datos agrupados por operador/bioanalista (nombre, examenes, tiempos).

Actualmente se descarta. Si se procesa, permitiria:
- Comparar rendimiento entre operadores
- Identificar necesidades de capacitacion
- Analizar distribucion de carga de trabajo

**Nota de sensibilidad:** Los datos de rendimiento individual deben manejarse
con confidencialidad y enfocarse en mejora, no en penalizacion.

Ver [INDICADORES.md](INDICADORES.md) seccion "Rendimiento por operador" para mas detalle.
