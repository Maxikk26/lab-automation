# Deploy en Ubuntu Server

Guia completa para instalar y correr Lab Automation (produccion) en un servidor Ubuntu
con tunel de Cloudflare. El ambiente de desarrollo corre local en tu maquina.

---

## 1. Requisitos del servidor

- Ubuntu 22.04+ (Server o Desktop)
- Minimo 2 GB RAM (5 contenedores Docker)
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

## 3. Clonar el proyecto

```bash
mkdir -p ~/lab-automation
cd ~/lab-automation
git clone <URL_DEL_REPO> .
```

---

## 4. Configurar variables de entorno

Crear `~/lab-automation/.env`:

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

---

## 5. Levantar el stack

```bash
cd ~/lab-automation
docker compose up -d --build
```

Verificar (deberias ver 5 contenedores):
```bash
docker ps
```

---

## 6. Firewall

```bash
sudo apt install -y ufw

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh

# Temporales: acceso en red local antes de configurar el tunel
sudo ufw allow 8080    # portal
sudo ufw allow 3000    # metabase

sudo ufw enable
```

> Cuando configures el tunel de Cloudflare (paso 9), cerraras estos puertos
> porque el tunel conecta desde adentro (conexion saliente).

---

## 7. Resumen de puertos

| Servicio        | Puerto |
|-----------------|--------|
| Portal (nginx)  | 8080   |
| Metabase        | 3000   |
| PostgreSQL      | 5432   |
| n8n             | 5678   |
| Backend         | interno |

---

## 8. Post-instalacion

1. Verificar contenedores: `docker ps`
2. Abrir n8n (`https://n8n.boheforge.dev` o `http://<IP>:5678`), crear credencial **"Lab PostgreSQL"**, importar workflows, activarlos
3. Abrir Metabase (`https://lab-dashboard.boheforge.dev` o `http://<IP>:3000`), configurar conexion a PostgreSQL (ver docs/METABASE-GUIA.md)
4. Abrir portal (`https://lab.boheforge.dev` o `http://<IP>:8080`), login `admin`/`admin123`, **cambiar contrasena inmediatamente**

---

## 9. Cloudflare Tunnel

### Subdominios

| Subdominio | Servicio | Puerto local | Acceso |
|---|---|---|---|
| `lab.boheforge.dev` | React portal | 8080 | Publico |
| `lab-dashboard.boheforge.dev` | Metabase | 3000 | Publico |
| `n8n.boheforge.dev` | n8n | 5678 | Cloudflare Access (solo admin) |

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
  - hostname: lab.boheforge.dev
    service: http://localhost:8080
  - hostname: lab-dashboard.boheforge.dev
    service: http://localhost:3000
  - hostname: n8n.boheforge.dev
    service: http://localhost:5678
  - service: http_status:404
```

### Registrar DNS

```bash
cloudflared tunnel route dns <TUNNEL_UUID> lab.boheforge.dev
cloudflared tunnel route dns <TUNNEL_UUID> lab-dashboard.boheforge.dev
cloudflared tunnel route dns <TUNNEL_UUID> n8n.boheforge.dev
```

### Proteger n8n con Cloudflare Access

1. Ir a **Cloudflare Dashboard > Zero Trust > Access > Applications**
2. Crear aplicacion:
   - **Application domain:** `n8n.boheforge.dev`
   - **Policy name:** "Solo admin"
   - **Action:** Allow
   - **Include rule:** Email = tu email personal
3. Guardar. Cualquier acceso a `n8n.boheforge.dev` pedira autenticacion via email OTP antes de llegar a n8n.

### Activar como servicio

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### Cerrar puertos publicos (ya no se necesitan)

```bash
sudo ufw delete allow 8080
sudo ufw delete allow 3000
```

> **Nota:** n8n nunca tuvo el puerto abierto en UFW, y ahora ademas
> queda detras de Cloudflare Access. Doble capa de proteccion.

---

## 10. Herramientas utiles (opcional)

```bash
# Monitoreo de recursos
sudo apt install -y htop

# TUI para Docker
curl https://raw.githubusercontent.com/jesseduffield/lazydocker/master/scripts/install_update_linux.sh | bash
```