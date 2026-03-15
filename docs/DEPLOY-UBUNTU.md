# Deploy en Ubuntu Server

Guia completa para instalar y correr Lab Automation en un servidor Ubuntu
con dos ambientes (produccion y desarrollo) y tunel de Cloudflare.

---

## 1. Requisitos del servidor

- Ubuntu 22.04+ (Server o Desktop)
- Minimo 4 GB RAM (5 contenedores Docker)
- 20 GB disco libre
- Acceso SSH

---

## 2. Instalar dependencias

### Actualizar sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### Docker + Docker Compose

```bash
sudo apt install -y ca-certificates curl gnupg lsb-release

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker
```

Verificar:
```bash
docker --version
docker compose version
```

### Git

```bash
sudo apt install -y git
```

---

## 3. Estructura de ambientes

```bash
mkdir -p ~/lab-automation/{prod,dev}
```

```
~/lab-automation/
+-- prod/     <-- puerto 8080 (futuro tunel Cloudflare)
+-- dev/      <-- puerto 8081 (solo acceso local)
```

### Clonar el repo en ambos

```bash
cd ~/lab-automation/prod
git clone <URL_DEL_REPO> .

cd ~/lab-automation/dev
git clone <URL_DEL_REPO> .
```

---

## 4. Configurar variables de entorno

### PROD (`~/lab-automation/prod/.env`)

Generar contraseñas seguras:
```bash
openssl rand -base64 32
```

```env
POSTGRES_USER=labadmin
POSTGRES_PASSWORD=<CONTRASEÑA_FUERTE>
POSTGRES_DB=lab_tiempos
POSTGRES_PORT=5432

N8N_USER=admin
N8N_PASSWORD=<CONTRASEÑA_FUERTE>
N8N_PORT=5678

JWT_SECRET=<SECRET_LARGO_ALEATORIO>

PORTAL_PORT=8080
METABASE_PORT=3000
```

### DEV (`~/lab-automation/dev/.env`)

```env
POSTGRES_USER=labadmin
POSTGRES_PASSWORD=devpassword123
POSTGRES_DB=lab_tiempos_dev
POSTGRES_PORT=5433

N8N_USER=admin
N8N_PASSWORD=devpassword123
N8N_PORT=5679

JWT_SECRET=dev-jwt-secret

PORTAL_PORT=8081
METABASE_PORT=3001
```

---

## 5. Evitar colision de contenedores (DEV)

Crear `~/lab-automation/dev/docker-compose.override.yml`:

```yaml
services:
  postgres:
    container_name: lab-postgres-dev
    ports:
      - "5433:5432"
  n8n:
    container_name: lab-n8n-dev
    ports:
      - "5679:5678"
  backend:
    container_name: lab-backend-dev
  portal:
    container_name: lab-portal-dev
    ports:
      - "8081:80"
  metabase:
    container_name: lab-metabase-dev
    ports:
      - "3001:3000"
```

---

## 6. Levantar los ambientes

```bash
# PROD
cd ~/lab-automation/prod
docker compose up -d --build

# DEV
cd ~/lab-automation/dev
docker compose up -d --build
```

Verificar (deberias ver 10 contenedores: 5 prod + 5 dev):
```bash
docker ps
```

---

## 7. Firewall

```bash
sudo apt install -y ufw

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh

# Acceso en red local
sudo ufw allow 8080    # portal prod
sudo ufw allow 3000    # metabase prod
# sudo ufw allow 8081  # portal dev (solo si necesitas acceso remoto)
# sudo ufw allow 5678  # n8n prod (solo si necesitas acceso directo)

sudo ufw enable
```

> Cuando configures el tunel de Cloudflare, podras cerrar los puertos 8080 y 3000
> al publico porque el tunel conecta desde adentro (conexion saliente).

---

## 8. Resumen de puertos

| Servicio        | PROD  | DEV   |
|-----------------|-------|-------|
| Portal (nginx)  | 8080  | 8081  |
| Metabase        | 3000  | 3001  |
| PostgreSQL      | 5432  | 5433  |
| n8n             | 5678  | 5679  |
| Backend         | interno | interno |

---

## 9. Post-instalacion

1. Verificar contenedores: `docker ps`
2. Abrir n8n prod (`http://<IP>:5678`), crear credencial **"Lab PostgreSQL"**, importar workflows, activarlos
3. Abrir Metabase (`http://<IP>:3000`), configurar conexion a PostgreSQL (ver docs/METABASE-GUIA.md)
4. Abrir portal (`http://<IP>:8080`), login `admin`/`admin123`, **cambiar contrasena inmediatamente**
5. Repetir pasos 2-4 para dev en puertos 5679, 3001, 8081

---

## 10. Cloudflare Tunnel (cuando tengas dominio)

### Instalar cloudflared

```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
rm cloudflared.deb
```

### Crear el tunel

```bash
cloudflared tunnel login
cloudflared tunnel create lab-automation
# Anotar el UUID que devuelve
```

### Configurar

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /home/<tu_usuario>/.cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: lab.tudominio.com
    service: http://localhost:8080
  - hostname: dashboard.tudominio.com
    service: http://localhost:3000
  - service: http_status:404
```

### Registrar DNS y activar

```bash
cloudflared tunnel route dns <TUNNEL_UUID> lab.tudominio.com
cloudflared tunnel route dns <TUNNEL_UUID> dashboard.tudominio.com

sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### Cerrar puertos publicos (ya no se necesitan)

```bash
sudo ufw delete allow 8080
sudo ufw delete allow 3000
```

---

## 11. Herramientas utiles (opcional)

```bash
# Monitoreo de recursos
sudo apt install -y htop

# TUI para Docker
curl https://raw.githubusercontent.com/jesseduffield/lazydocker/master/scripts/install_update_linux.sh | bash
```
