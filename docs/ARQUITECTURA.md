# Arquitectura del Sistema - Lab InmunoXXI

## Vision General

El sistema automatiza el procesamiento de reportes de tiempos de entrega del laboratorio
exportados desde Enterprise. Los archivos .xls se suben a traves de un portal web, se
procesan con n8n, se almacenan en PostgreSQL, y se visualizan en Metabase.

```
Portal React (8080/nginx)
   |                          |
   | POST /api/webhook/*      | /api/portal/*
   v                          v
n8n (5678)              Backend Express (3001)
   |                          |
   | Parsea XLS              | Auth, usuarios, permisos
   | Valida estructura       |
   | Transforma datos        |
   |                          |
   +------> PostgreSQL (5432) <------+
                  |
                  v
          Metabase (3000)
```

---

## Infraestructura Docker

### Servicios

| Servicio   | Imagen                  | Puerto | Contenedor    | Funcion                          |
|------------|-------------------------|--------|---------------|----------------------------------|
| postgres   | postgres:16-alpine      | 5432   | lab-postgres  | Base de datos principal          |
| n8n        | n8nio/n8n:latest        | 5678   | lab-n8n       | Motor de automatizacion          |
| backend    | Build local (node)      | 3001   | lab-backend   | API del portal (auth, usuarios)  |
| portal     | Build local (nginx)     | 8080   | lab-portal    | Interfaz web + proxy reverso     |
| metabase   | metabase/metabase       | 3000   | lab-metabase  | Dashboards y visualizaciones     |

### Volumenes

| Volumen        | Montaje                           | Contenido                |
|----------------|-----------------------------------|--------------------------|
| postgres_data  | /var/lib/postgresql/data          | Datos de PostgreSQL      |
| n8n_data       | /home/node/.n8n                   | Config y metadata de n8n |
| metabase_data  | /metabase-data                    | Config de Metabase (H2)  |
| ./data         | /home/node/.n8n-files (en n8n)    | Archivos de entrada/salida |

### Variables de Entorno (.env)

| Variable         | Descripcion                    |
|------------------|--------------------------------|
| POSTGRES_USER    | Usuario de PostgreSQL          |
| POSTGRES_PASSWORD| Password de PostgreSQL         |
| POSTGRES_DB      | Nombre de la base de datos     |
| N8N_PORT         | Puerto externo de n8n          |
| PORTAL_PORT      | Puerto externo del portal      |
| METABASE_PORT    | Puerto externo de Metabase     |
| JWT_SECRET       | Secret para tokens JWT         |

### Proxy nginx (Portal)

El portal (nginx) hace proxy de las peticiones hacia los servicios internos:

| Ruta del portal             | Destino                           |
|-----------------------------|-----------------------------------|
| /api/portal/*               | http://backend:3001/api/portal/*  |
| /api/webhook/*              | http://n8n:5678/webhook/*         |
| /api/webhook-test/*         | http://n8n:5678/webhook-test/*    |

---

## Base de Datos

### Esquema: tiempos_entrega

Todas las tablas de datos del laboratorio. El `search_path` del rol `labadmin`
incluye este esquema, por lo que las queries no necesitan prefijo.

#### Tablas

**periodos** - Un registro por cada archivo/mes procesado.

| Columna         | Tipo          | Notas                    |
|-----------------|---------------|--------------------------|
| id              | SERIAL PK     |                          |
| fecha_inicio    | DATE          | Inicio del rango         |
| fecha_fin       | DATE          | Fin del rango            |
| mes             | VARCHAR(20)   | ENE, FEB, etc.           |
| anio            | INTEGER       | 2025, 2026, etc.         |
| archivo_origen  | VARCHAR(255)  | Nombre del archivo       |
| UNIQUE          |               | (fecha_inicio, fecha_fin)|

**metas_seccion** - Dias meta por seccion (configurables).

| Columna    | Tipo          | Notas                |
|------------|---------------|----------------------|
| seccion    | VARCHAR(255)  | UNIQUE               |
| meta_dias  | NUMERIC(10,4) | Dias meta            |

**tiempos_seccion** - Resumen de tiempos por seccion y periodo.

| Columna                     | Tipo          | Notas                           |
|-----------------------------|---------------|---------------------------------|
| periodo_id                  | INTEGER FK    | -> periodos(id) CASCADE         |
| seccion                     | VARCHAR(255)  |                                 |
| total_examenes              | INTEGER       |                                 |
| *_horas                     | VARCHAR(50)   | 5 fases en formato HH:MM       |
| *_dias                      | NUMERIC(10,4) | Conversion automatica a dias   |
| meta_dias                   | NUMERIC(10,4) | Meta al momento del procesamiento|
| eficacia                    | NUMERIC(10,4) | meta / dias (>=1 = cumple)     |
| UNIQUE                      |               | (periodo_id, seccion)          |

**tiempos_examen** - Detalle granular por examen individual.

| Columna        | Tipo          | Notas                                    |
|----------------|---------------|------------------------------------------|
| periodo_id     | INTEGER FK    | -> periodos(id) CASCADE                  |
| seccion_padre  | VARCHAR(255)  | Solo se llena con archivos por seccion   |
| examen         | TEXT          | Nombre del examen                        |
| (mismas cols)  |               | Mismo esquema de horas/dias que seccion  |

#### Vistas (consumidas por Metabase)

| Vista                  | Descripcion                                         |
|------------------------|-----------------------------------------------------|
| v_reporte_mensual      | Reporte mensual con eficacia y semaforo              |
| v_tendencia_anual      | Datos para graficar tendencia mes a mes              |
| v_examenes_seccion     | Detalle por examen: dias, meta, excede, diferencia   |
| v_portafolio_seccion   | % pruebas fuera de meta por seccion                  |
| v_promedio_acumulado   | Promedio acumulado anual con eficacia                |

### Esquema: portal_config

| Tabla | Descripcion |
|-------|-------------|
| usuarios | Login, nombre, flag es_admin, activo |
| categorias | Agrupacion de automatizaciones (nombre, icono, orden) |
| automatizaciones | Catalogo: nombre, webhook, extensiones, etc. |
| usuario_automatizacion | Tabla puente: que usuario ve que automatizacion |

### Archivos de inicializacion (db-init/)

| Archivo               | Contenido                                  |
|------------------------|---------------------------------------------|
| 01-schema.sql          | Esquema tiempos_entrega, tablas, vistas base, metas default |
| 02-views-seccion.sql   | Vistas de seccion y promedio acumulado      |
| 03-portal.sql          | Esquema portal_config: usuarios, permisos   |

Se ejecutan automaticamente al crear la BD por primera vez.

---

## Workflows n8n

### Tipos de workflow

| Workflow                              | Trigger      | Archivo JSON                          | Proposito                     |
|---------------------------------------|--------------|---------------------------------------|-------------------------------|
| Webhook Tiempos por Seccion           | Webhook POST | n8n-workflow-webhook-seccion.json     | Portal -> archivos por seccion |
| Webhook Tiempos Global                | Webhook POST | n8n-workflow-webhook-global.json      | Portal -> archivo global       |
| Webhook Tiempos Unificado             | Webhook POST | n8n-workflow-webhook-unificado.json   | Portal -> multi-pestana        |

### Flujo Webhook

```
[Portal envia archivo]
    |
Recibir Archivo (Webhook POST)
    |
Parsear XLS (SpreadsheetFile)
    |
Validar y Transformar (Code)
  - Valida estructura del archivo
  - Extrae fechas, secciones, examenes
  - Convierte tiempos HH:MM a dias: (horas + minutos/60) / 24
  - Genera SQL con upsert (ON CONFLICT DO UPDATE)
    |
Es Valido? (IF)
  +-- SI -> Guardar en BD -> Responder OK (200)
  +-- NO -> Responder Error (400)
```

### Credenciales necesarias

Nombre: **Lab PostgreSQL** (debe crearse manualmente en n8n)
- Host: `postgres`
- Port: `5432`
- Database: `lab_tiempos`
- User: `labadmin`
- Password: (la del .env)

### Webhooks registrados

| Path              | Metodo | URL via portal                          |
|-------------------|--------|----------------------------------------|
| tiempos-seccion   | POST   | /api/webhook/tiempos-seccion           |
| tiempos-global    | POST   | /api/webhook/tiempos-global            |
| tiempos-unificado | POST   | /api/webhook/tiempos-unificado         |

---

## Portal Web (React)

### Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- React Router
- react-dropzone (drag & drop de archivos)
- lucide-react (iconos)
- nginx (serving + proxy)

### Autenticacion

- **Login**: Usuario/contrasena contra PostgreSQL (bcrypt)
- **Token**: JWT con expiracion de 24 horas, almacenado en localStorage
- **Permisos**: Cada usuario solo ve las automatizaciones asignadas
- **Admin**: Flag `es_admin` permite ver todo + panel de gestion de usuarios

### API del Backend (Express)

| Endpoint | Metodo | Acceso | Funcion |
|----------|--------|--------|---------|
| /api/portal/login | POST | Publico | Autenticacion (devuelve JWT) |
| /api/portal/automatizaciones | GET | Autenticado | Lista automatizaciones del usuario |
| /api/portal/admin/usuarios | GET | Admin | Lista todos los usuarios + permisos |
| /api/portal/admin/usuarios/save | POST | Admin | Crear/editar usuario + permisos |
| /api/portal/admin/usuarios/delete | POST | Admin | Desactivar usuario |
| /api/portal/health | GET | Publico | Health check |

### Estructura de archivos

```
portal/src/
  api.ts                   # Cliente HTTP
  context/AuthContext.tsx   # Estado global de autenticacion
  hooks/useFileUpload.ts   # Logica de carga y procesamiento
  components/
    Layout.tsx             # Layout principal con sidebar
    Sidebar.tsx            # Navegacion lateral dinamica
    DropZone.tsx           # Area de drag & drop
    FileItem.tsx           # Estado visual por archivo
  pages/
    LoginPage.tsx          # Pagina de login
    HomePage.tsx           # Pagina principal con tarjetas
    UploadPage.tsx         # Pagina de carga por workflow
    AdminUsersPage.tsx     # Panel admin: CRUD usuarios + permisos
  types/index.ts           # Tipos TypeScript
  App.tsx                  # Router con proteccion de rutas
  main.tsx                 # Entry point
```

---

## Agregar Nuevas Automatizaciones

Para agregar un flujo completamente nuevo (ej: control de calidad):

### 1. Base de datos
Crear un nuevo archivo SQL (ej: `db-init/04-control-calidad.sql`) con su propio esquema.

### 2. Workflow n8n
Crear el JSON del workflow con Webhook + parseo + Postgres insert.

### 3. Registrar en el portal
```sql
INSERT INTO portal_config.automatizaciones
  (categoria_id, nombre, descripcion, instrucciones, webhook_path, extensiones, max_archivos, icono, orden)
VALUES (...);
```
No requiere rebuild del portal. Los usuarios veran la nueva automatizacion al recargar.

### 4. Dashboards
Crear vistas SQL en PostgreSQL y agregar las preguntas en Metabase.

---

## Archivos del Proyecto

```
lab-automation/
+-- .env.example                         # Template de variables de entorno
+-- .gitignore                           # Exclusiones de git
+-- docker-compose.yml                   # Orquestacion de 5 servicios
+-- db-init/
|   +-- 01-schema.sql                    # Esquema tiempos_entrega
|   +-- 02-views-seccion.sql             # Vistas de seccion
|   +-- 03-portal.sql                    # Esquema portal_config
+-- backend/                             # API Express + TypeScript
|   +-- Dockerfile
|   +-- package.json
|   +-- src/
|       +-- index.ts, db.ts, auth.ts
|       +-- routes/ (login, automatizaciones, usuarios)
+-- portal/                              # App React
|   +-- Dockerfile
|   +-- nginx.conf
|   +-- package.json
|   +-- src/
+-- n8n-workflow-webhook-seccion.json    # Webhook: archivos por seccion
+-- n8n-workflow-webhook-global.json     # Webhook: archivo global
+-- n8n-workflow-webhook-unificado.json  # Webhook: multi-pestana
+-- docs/                                # Documentacion
+-- CLAUDE.md                            # Guia para Claude Code
+-- README.md                            # Documentacion principal
```
