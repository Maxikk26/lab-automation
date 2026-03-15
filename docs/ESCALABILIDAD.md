# Escalabilidad y Plan de Crecimiento

Como el sistema puede crecer desde su estado actual hasta un entorno mas robusto.

---

## Estado actual

```
1 servidor Ubuntu
+-- PROD: 5 contenedores (postgres, n8n, backend, portal, metabase)
+-- DEV:  5 contenedores (mismos, puertos diferentes)
```

Todo corre en un solo servidor. Sin backups automaticos. Sin CI/CD.

---

## Fase 1: Fundamentos (inmediato)

### Backups de PostgreSQL

Crear un cron job para backup diario:

```bash
# Crear directorio de backups
mkdir -p ~/backups/postgres

# Agregar cron (ejecuta a las 2:00 AM)
crontab -e
```

```cron
0 2 * * * docker exec lab-postgres pg_dump -U labadmin lab_tiempos | gzip > ~/backups/postgres/backup-$(date +\%Y\%m\%d).sql.gz
0 3 * * * find ~/backups/postgres -mtime +30 -delete
```

La primera linea hace el backup, la segunda limpia backups de mas de 30 dias.

### Backup de volumenes Docker

```bash
# Backup de Metabase (configuracion de dashboards)
docker run --rm -v lab-automation_metabase_data:/data -v ~/backups:/backup alpine tar czf /backup/metabase-$(date +%Y%m%d).tar.gz -C /data .

# Backup de n8n (workflows y credenciales)
docker run --rm -v lab-automation_n8n_data:/data -v ~/backups:/backup alpine tar czf /backup/n8n-$(date +%Y%m%d).tar.gz -C /data .
```

### Monitoreo basico

Agregar healthcheck a los servicios que no lo tienen en docker-compose:

```yaml
backend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3001/api/portal/health"]
    interval: 30s
    timeout: 5s
    retries: 3
```

Verificar con: `docker ps` (columna STATUS muestra healthy/unhealthy).

---

## Fase 2: Dominio y acceso externo

### Cloudflare Tunnel

Ver [DEPLOY-UBUNTU.md](DEPLOY-UBUNTU.md) seccion 10 para la guia completa.

Beneficios:
- Sin necesidad de abrir puertos en el firewall
- HTTPS automatico (certificado de Cloudflare)
- Proteccion DDoS incluida
- Sin necesidad de IP publica fija

### Subdominios sugeridos

| Subdominio | Servicio | Puerto interno |
|------------|----------|---------------|
| lab.tudominio.com | Portal (nginx) | 8080 |
| dashboard.tudominio.com | Metabase | 3000 |

n8n y PostgreSQL no se exponen al exterior.

---

## Fase 3: CI/CD con Git

### Flujo basico con git pull

El mas simple: un script que hace pull y rebuild en el servidor.

```bash
#!/bin/bash
# ~/lab-automation/deploy.sh
cd ~/lab-automation/prod
git pull origin main
docker compose up -d --build
```

Se ejecuta manualmente por SSH o con un webhook de GitHub.

### GitHub Actions (mas robusto)

Cuando el repo este en GitHub, se puede automatizar:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: SSH and deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_IP }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd ~/lab-automation/prod
            git pull origin main
            docker compose up -d --build
```

---

## Fase 4: Nuevas automatizaciones

El sistema esta diseñado para agregar nuevas automatizaciones sin tocar el portal:

### Patron para cada nueva automatizacion

1. **Nuevo esquema SQL** - `db-init/04-nombre.sql` con tablas y vistas propias
2. **Workflow n8n** - JSON con webhook + parseo + insert
3. **Registro en portal** - INSERT en `portal_config.automatizaciones`
4. **Dashboards Metabase** - Nuevas preguntas usando las vistas SQL

Cada automatizacion es independiente: su propio esquema, sus propias vistas,
sus propios dashboards. El portal las descubre automaticamente de la BD.

### Automatizaciones potenciales

| Automatizacion | Datos fuente | Valor |
|---------------|-------------|-------|
| Control de Calidad | Reportes de QC | Seguimiento de controles internos |
| Inventario de Reactivos | Kardex de almacen | Alertas de stock bajo |
| Productividad por Operador | Data cruda Enterprise | Distribucion de carga (ver INDICADORES.md) |
| Satisfaccion del Paciente | Encuestas | Correlacion con tiempos de entrega |

---

## Fase 5: Alta disponibilidad (futuro lejano)

Si el sistema crece lo suficiente para justificarlo:

### PostgreSQL externo

Migrar de contenedor Docker a un servicio managed (ej: AWS RDS, DigitalOcean Managed DB).
Beneficios: backups automaticos, replicas de lectura, failover automatico.

Solo requiere cambiar las variables de entorno DB_HOST, DB_PORT en docker-compose.

### Segundo servidor

```
Servidor 1 (produccion)
  +-- portal, backend, n8n, metabase
  +-- Conecta a PostgreSQL externo

Servidor 2 (standby/desarrollo)
  +-- Misma configuracion
  +-- Conecta a replica de lectura
```

### Docker Swarm / Kubernetes

Solo si hay necesidad de escalar horizontalmente (multiples instancias del portal/backend).
Para un laboratorio esto probablemente nunca sera necesario.

---

## Resumen de prioridades

| Prioridad | Tarea | Esfuerzo | Impacto |
|-----------|-------|----------|---------|
| 1 | Backups diarios PostgreSQL | 15 min | Critico |
| 2 | Cloudflare Tunnel | 30 min | Alto |
| 3 | Git pull deploy script | 15 min | Medio |
| 4 | Healthchecks en todos los servicios | 15 min | Medio |
| 5 | GitHub Actions CI/CD | 1 hora | Medio |
| 6 | PostgreSQL externo | 2 horas | Bajo (por ahora) |
