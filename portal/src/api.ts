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
  automatizacion_ids: number[];
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
