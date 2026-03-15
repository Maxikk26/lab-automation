# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lab Automation -- Laboratorio InmunoXXI** is a pipeline for processing laboratory delivery-time reports (.xls files) exported from an Enterprise system. Files are uploaded through a React portal, parsed by n8n workflows (using the XLSX library), stored in PostgreSQL, and visualized in Metabase dashboards via SQL views.

## Architecture

```
Portal (React + Nginx :8080)
  +-- /api/portal/*  ->  backend (Express :3001)  ->  PostgreSQL :5432
  +-- /api/webhook/* ->  n8n (:5678)              ->  PostgreSQL :5432
                                                          |
                                                   Metabase (:3000)
```

Five Docker services: `postgres`, `n8n`, `backend`, `portal`, `metabase`. All on the same Compose network. Nginx is the only public-facing entry point.

**Database schemas:**
- `tiempos_entrega` -- lab data tables (`periodos`, `metas_seccion`, `tiempos_seccion`, `tiempos_examen`) plus six Metabase views defined in `db-views/views.sql`.
- `portal_config` -- app config (`usuarios`, `categorias`, `automatizaciones`, `usuario_automatizacion`).

**Views workflow:** All views live in `db-views/views.sql` (single source of truth). The backend applies them automatically on startup via `backend/src/apply-views.ts`. To update views: edit `db-views/views.sql` → `docker compose restart backend`. No database wipe needed.

**n8n Workflows (`n8n/workflows/`):**
| File | Webhook path | Purpose |
|------|-------------|---------|
| `webhook-seccion.json` | `/api/webhook/tiempos-seccion` | Up to 30 single-section .xls files |
| `webhook-global.json` | `/api/webhook/tiempos-global` | One consolidated .xls with all sections |
| `webhook-unificado.json` | `/api/webhook/tiempos-unificado` | One multi-sheet .xls (one sheet per section) |

## Project Structure

```
lab-automation/
+-- docker-compose.yml
+-- .env.example
+-- backend/           # Express + TypeScript API
+-- portal/            # React + Vite + nginx
+-- db-init/           # SQL init scripts (mounted by Docker)
+-- n8n/workflows/     # n8n workflow JSONs
+-- docs/              # Project documentation
```

## Commands

### Docker (primary workflow)
```bash
docker compose up -d --build      # Start all services
docker compose down               # Stop (keep volumes)
docker compose down -v            # Stop and wipe database
docker compose logs -f <service>  # Stream logs (backend, portal, n8n, postgres, metabase)
docker compose restart <service>  # Restart one service
```

### Backend (Express + TypeScript)
```bash
cd backend
npm install
npm run dev      # tsx watch -- auto-reload on changes, port 3001
npm run build    # Compile TS -> dist/
npm start        # Run compiled dist/index.js
```

### Portal (React + Vite)
```bash
cd portal
npm install
npm run dev      # Vite dev server, port 5173 (proxies /api/* to localhost:5678/3001)
npm run build    # Production build -> dist/
npm run preview  # Serve production build locally
```

There are no automated tests in this repo.

## Key Implementation Details

### Authentication
- JWT (24 h expiry) signed with `JWT_SECRET`. Token stored in `localStorage`.
- Passwords hashed with bcryptjs (10 rounds). Default admin: `admin` / `admin123`.
- `requireAuth` middleware reads `Authorization: Bearer <token>`. `requireAdmin` checks `es_admin` flag.
- Non-admin users see only workflows assigned via `usuario_automatizacion`; admins see all.

### File Processing (n8n Code nodes)
- Files arrive as `multipart/form-data` at the n8n webhook.
- XLSX library parses the binary: `const wb = XLSX.read(Buffer.from(data, 'base64'), { type: 'buffer' })`.
- Row layout (0-indexed): row 0 = date range header, row 5 = section summary, rows 9+ = exam details until a "Total" row.
- Time values (HH:MM string) convert to days: `(hours + minutes/60) / 24`.
- SQL is built inline (batch VALUES) and executed by a PostgreSQL node credentialed as **"Lab PostgreSQL"**.
- Upserts use `ON CONFLICT ... DO UPDATE` keyed on periodo + section, so re-processing is idempotent.

### Database Access from Backend
- Connection pool in `backend/src/db.ts` (`pg` library, `max: 10`).
- All queries use parameterized statements (`$1`, `$2`, ...). Never interpolate user input.

### Frontend State
- `AuthContext` (`src/context/AuthContext.tsx`) holds `user`, `token`, `workflows`; persists to `localStorage`.
- `useFileUpload` hook (`src/hooks/useFileUpload.ts`) tracks per-file state: `pending -> uploading -> success | error`.
- One `fetch` call per file to `POST /api/webhook/{webhook_path}` (FormData, no batching at HTTP level).

### nginx
- SPA fallback: `try_files $uri /index.html`.
- Proxy timeouts and `client_max_body_size 50m` set for webhook routes.
- Static assets: 30-day `Cache-Control: immutable`.

## Environment Variables (`.env`)
```
POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB
N8N_USER / N8N_PASSWORD / N8N_PORT
JWT_SECRET
PORTAL_PORT
METABASE_PORT
```
`GENERIC_TIMEZONE=America/Caracas` is set on n8n (affects cron workflows).

## First-time Setup
1. `cp .env.example .env` -- fill in secure passwords.
2. `docker compose up -d --build` -- db-init scripts run automatically on first start.
3. Open n8n UI (`:5678`), create PostgreSQL credential named exactly **"Lab PostgreSQL"**, import the three webhook workflow JSONs from `n8n/workflows/`, activate them.
4. Open Metabase (`:3000`), connect to PostgreSQL, create dashboards (see `docs/METABASE-GUIA.md`).
5. Open portal (`:8080`), log in as `admin`/`admin123`, create users and assign workflows via Admin panel.

## Pending / Known Issues
See `docs/PENDIENTES.md` for open decisions and known calculation edge cases.
