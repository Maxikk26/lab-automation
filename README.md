# Automatizacion Tiempos de Entrega - Laboratorio InmunoXXI

Sistema automatizado para procesar reportes de tiempos de entrega exportados del
sistema Enterprise y visualizarlos en dashboards interactivos.

## Arquitectura

```
Portal (React) --> n8n (procesa XLS) --> PostgreSQL --> Metabase (dashboards)
```

| Servicio   | Puerto | Descripcion                          |
|------------|--------|--------------------------------------|
| Portal     | 8080   | Interfaz para subir archivos         |
| n8n        | 5678   | Automatizacion de flujos             |
| PostgreSQL | 5432   | Base de datos                        |
| Metabase   | 3000   | Dashboards y visualizaciones         |
| Backend    | 3001   | API interna (auth, usuarios)         |

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/install/)
- Minimo 4 GB de RAM disponible

## Instalacion

### 1. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con contraseñas seguras
```

### 2. Levantar los servicios

```bash
docker compose up -d --build
```

Esperar 1-2 minutos. Verificar con:

```bash
docker compose ps
```

Los 5 servicios deben estar en estado "running".

### 3. Configurar n8n

1. Abrir http://servidor:5678
2. Crear cuenta de administrador (primera vez)
3. Ir a **Settings > Credentials > Add Credential**
4. Seleccionar **Postgres** y configurar:

   | Campo    | Valor             |
   |----------|-------------------|
   | Host     | `postgres`        |
   | Port     | `5432`            |
   | Database | (valor de POSTGRES_DB en .env) |
   | User     | (valor de POSTGRES_USER en .env) |
   | Password | (valor de POSTGRES_PASSWORD en .env) |

5. Nombrar la credencial: **Lab PostgreSQL**
6. Guardar

### 4. Importar los workflows de n8n

Los archivos estan en `n8n/workflows/`:

| Archivo | Descripcion |
|---------|-------------|
| `webhook-seccion.json` | Archivos .xls por seccion individual |
| `webhook-global.json` | Archivo .xls global consolidado |
| `webhook-unificado.json` | Archivo .xls multi-pestana |

Para cada workflow:

1. En n8n, ir a **Workflows > Import from File**
2. Seleccionar el archivo `.json`
3. Abrir el nodo **"Guardar en BD"**
4. Asignar la credencial **Lab PostgreSQL**
5. Guardar y **Activar** el workflow

### 5. Configurar Metabase

1. Abrir http://servidor:3000
2. Crear cuenta de administrador
3. Conectar a PostgreSQL (host: `postgres`, puerto: `5432`, base: valor de POSTGRES_DB)
4. Crear dashboards con las vistas SQL (ver `docs/METABASE-GUIA.md`)

## Uso Diario

1. Abrir http://servidor:8080
2. Hacer login (default: `admin` / `admin123` -- cambiar despues del primer uso)
3. Seleccionar la automatizacion correspondiente
4. Arrastrar o seleccionar los archivos .xls
5. Click en "Procesar"
6. Los datos estaran disponibles en Metabase inmediatamente

## Estructura del Proyecto

```
lab-automation/
+-- docker-compose.yml          # Orquestacion de 5 servicios
+-- .env.example                # Template de variables de entorno
+-- backend/                    # API Express + TypeScript
+-- portal/                     # App React + nginx
+-- db-init/                    # Scripts SQL de inicializacion
+-- n8n/workflows/              # Workflows de n8n (JSON)
+-- docs/                       # Documentacion completa
```

## Base de Datos

Esquema `tiempos_entrega`:

| Tabla             | Descripcion                                           |
|-------------------|-------------------------------------------------------|
| `periodos`        | Un registro por cada archivo procesado (mes/anio)     |
| `metas_seccion`   | Dias meta por seccion (configurables)                 |
| `tiempos_seccion` | Tiempos resumen por seccion y periodo                 |
| `tiempos_examen`  | Tiempos detallados por examen individual              |

Vistas (consumidas por Metabase):

| Vista                    | Descripcion                                          |
|--------------------------|------------------------------------------------------|
| `v_reporte_mensual`      | Reporte con eficacia y semaforo por seccion          |
| `v_tendencia_anual`      | Tendencia mes a mes para graficos                    |
| `v_examenes_seccion`     | Detalle por examen con META y si excede              |
| `v_portafolio_seccion`   | Pruebas fuera de meta por seccion                    |
| `v_promedio_acumulado`   | Promedio acumulado anual con eficacia                |

## Modificar METAs

```sql
SELECT * FROM metas_seccion ORDER BY seccion;

UPDATE metas_seccion SET meta_dias = 1.0, updated_at = NOW()
WHERE seccion = 'QUIMICA';
```

## Solucion de Problemas

```bash
# Ver logs de un servicio
docker compose logs -f <servicio>

# Reiniciar todo desde cero
docker compose down -v
docker compose up -d --build
```

## Documentacion

| Documento | Descripcion |
|-----------|-------------|
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Arquitectura tecnica completa |
| [docs/METABASE-GUIA.md](docs/METABASE-GUIA.md) | Guia de Metabase: conexion y dashboards |
| [docs/DEPLOY-UBUNTU.md](docs/DEPLOY-UBUNTU.md) | Deploy en Ubuntu: Docker, 2 ambientes, Cloudflare |
| [docs/ESCALABILIDAD.md](docs/ESCALABILIDAD.md) | Plan de crecimiento y mejoras futuras |
| [docs/INDICADORES.md](docs/INDICADORES.md) | Indicadores potenciales con data existente |
| [docs/PENDIENTES.md](docs/PENDIENTES.md) | Decisiones pendientes y hallazgos tecnicos |
