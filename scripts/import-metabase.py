"""
Importar dashboards de Metabase desde metabase-export.json

Uso:
    python scripts/import-metabase.py <METABASE_URL> <EMAIL> <PASSWORD>

Ejemplo local:
    python scripts/import-metabase.py http://localhost:3000 admin@example.com pass123

Ejemplo produccion:
    python scripts/import-metabase.py https://lab-dashboard.boheforge.dev admin@example.com pass123
"""
import json
import sys
import os
import urllib.request
import urllib.error

if len(sys.argv) < 4:
    print("Uso: python scripts/import-metabase.py <METABASE_URL> <EMAIL> <PASSWORD>")
    sys.exit(1)

BASE = sys.argv[1].rstrip("/")
EMAIL = sys.argv[2]
PASSWORD = sys.argv[3]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXPORT_FILE = os.path.join(SCRIPT_DIR, "metabase-export.json")


def api(method, path, data=None):
    url = BASE + path
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    if TOKEN:
        req.add_header("X-Metabase-Session", TOKEN)
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print("  ERROR %s %s: %s" % (method, path, e.read().decode()))
        sys.exit(1)


# --- Login ---
print("==> Conectando a %s" % BASE)
TOKEN = None
result = api("POST", "/api/session", {"username": EMAIL, "password": PASSWORD})
TOKEN = result["id"]
print("    Session OK")

# --- Find database ---
dbs = api("GET", "/api/database")
db_id = None
for d in dbs["data"]:
    name = d["name"].lower()
    if "lab" in name or "tiempos" in name:
        db_id = d["id"]
        break

if not db_id:
    print("ERROR: No se encontro la base de datos Lab Tiempos")
    sys.exit(1)
print("    Database ID: %d" % db_id)

# --- Load export ---
with open(EXPORT_FILE, "r", encoding="utf-8") as f:
    export = json.load(f)
print("    Export cargado: %d cards, 1 dashboard" % len(export["cards"]))

# --- Create collection ---
print("==> Creando coleccion...")
coll = api("POST", "/api/collection", {
    "name": export["collection_name"],
    "description": "Dashboard e indicadores de tiempos de entrega"
})
coll_id = coll["id"]
print("    Collection ID: %d" % coll_id)

# --- Create cards ---
print("==> Creando preguntas...")
card_map = {}  # name -> new card id

for i, card in enumerate(export["cards"]):
    # Patch database ID in query
    query = card["dataset_query"]
    query["database"] = db_id

    new_card = api("POST", "/api/card", {
        "name": card["name"],
        "description": card.get("description"),
        "display": card["display"],
        "dataset_query": query,
        "visualization_settings": card["visualization_settings"],
        "collection_id": coll_id,
    })
    card_map[card["name"]] = new_card["id"]
    print("    %d/%d %s (ID: %d)" % (i + 1, len(export["cards"]), card["name"], new_card["id"]))

# --- Create dashboard ---
print("==> Creando dashboard...")
dash_cfg = export["dashboard"]
dash = api("POST", "/api/dashboard", {
    "name": dash_cfg["name"],
    "description": dash_cfg.get("description"),
    "collection_id": coll_id,
    "parameters": dash_cfg.get("parameters", []),
})
dash_id = dash["id"]
print("    Dashboard ID: %d" % dash_id)

# --- Add cards to dashboard ---
print("==> Configurando layout...")
dashcards = []
for idx, dc in enumerate(dash_cfg["dashcards"]):
    card_name = dc.get("card_name")
    new_card_id = card_map.get(card_name) if card_name else None

    if not new_card_id:
        print("    SKIP: card '%s' no encontrada" % card_name)
        continue

    dashcards.append({
        "id": -(idx + 1),
        "card_id": new_card_id,
        "row": dc["row"],
        "col": dc["col"],
        "size_x": dc["size_x"],
        "size_y": dc["size_y"],
        "parameter_mappings": dc.get("parameter_mappings", []),
        "visualization_settings": dc.get("visualization_settings", {}),
    })

api("PUT", "/api/dashboard/%d" % dash_id, {"dashcards": dashcards})
print("    %d tarjetas agregadas" % len(dashcards))

# --- Done ---
print("")
print("=" * 50)
print("  LISTO!")
print("=" * 50)
print("")
print("  Dashboard: %s/dashboard/%d" % (BASE, dash_id))
print("  Coleccion: %s/collection/%d" % (BASE, coll_id))
print("")
print("  NOTA: Filtros y formato condicional se")
print("  mantienen tal como los configuraste.")
print("=" * 50)
