const API_BASE = '/api/portal';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function fetchAutomatizaciones() {
  const res = await fetch(`${API_BASE}/automatizaciones`, {
    headers: authHeaders(),
  });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

export async function fetchUsuarios() {
  const res = await fetch(`${API_BASE}/admin/usuarios`, {
    headers: authHeaders(),
  });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

export async function saveUsuario(data: {
  id?: number;
  username: string;
  nombre: string;
  password?: string;
  es_admin: boolean;
  activo?: boolean;
  automatizaciones?: Array<{ id: number; puede_cargar: boolean; puede_editar_metas: boolean; puede_editar_examenes: boolean }>;
  automatizacion_ids?: number[];
}) {
  const res = await fetch(`${API_BASE}/admin/usuarios/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

export async function deleteUsuario(id: number) {
  const res = await fetch(`${API_BASE}/admin/usuarios/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ id }),
  });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

// ── Secciones ──

export async function fetchSecciones() {
  const res = await fetch(`${API_BASE}/secciones`, { headers: authHeaders() });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

// ── Importaciones log ──

export async function fetchImportacionesLog(limit = 50, estado?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (estado) params.set('estado', estado);
  const res = await fetch(`${API_BASE}/importaciones/log?${params}`, { headers: authHeaders() });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

// ── Metas ──

export async function fetchMetas(anio: number) {
  const res = await fetch(`${API_BASE}/metas?anio=${anio}`, { headers: authHeaders() });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

export async function saveMetaDefault(seccion: string, meta_dias: number) {
  const res = await fetch(`${API_BASE}/admin/metas/default`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ seccion, meta_dias }),
  });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

export async function saveMetaPeriodo(data: { seccion: string; anio: number; mes: string; meta_dias: number }) {
  const res = await fetch(`${API_BASE}/admin/metas/periodo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

export async function deleteMetaPeriodo(data: { seccion: string; anio: number; mes: string }) {
  const res = await fetch(`${API_BASE}/admin/metas/periodo/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

// ── Exclusiones ──

export async function fetchExamenesCatalogo(seccion?: string) {
  const q = seccion ? `?seccion=${encodeURIComponent(seccion)}` : '';
  const res = await fetch(`${API_BASE}/examenes/catalogo${q}`, { headers: authHeaders() });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

export async function fetchExclusiones(seccion?: string) {
  const q = seccion ? `?seccion=${encodeURIComponent(seccion)}` : '';
  const res = await fetch(`${API_BASE}/exclusiones${q}`, { headers: authHeaders() });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

export async function saveExclusion(
  data: Array<{ seccion: string; codigo_examen: string; nombre_examen?: string; motivo?: string }>
    | { seccion: string; codigo_examen: string; nombre_examen?: string; motivo?: string }
) {
  const res = await fetch(`${API_BASE}/admin/exclusiones/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

export async function deleteExclusion(
  data: Array<{ seccion: string; codigo_examen: string }>
    | { seccion: string; codigo_examen: string }
) {
  const res = await fetch(`${API_BASE}/admin/exclusiones/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

// ── Tolerancias ──

export async function fetchTolerancias() {
  const res = await fetch(`${API_BASE}/tolerancias`, { headers: authHeaders() });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

export async function saveTolerancia(data: {
  anio?: number | null; mes?: string | null;
  umbral_en_rango: number; umbral_alerta: number; umbral_critico: number;
  umbral_dias_cumple: number; umbral_dias_alerta: number; umbral_dias_critico: number;
}) {
  const res = await fetch(`${API_BASE}/admin/tolerancias/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}
