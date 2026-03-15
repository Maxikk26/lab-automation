import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Pencil,
  UserX,
  Loader2,
  Shield,
  ShieldCheck,
  X,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchUsuarios, saveUsuario, deleteUsuario } from '../api';
import type { UserDetail, WorkflowConfig } from '../types';

interface UserForm {
  id?: number;
  username: string;
  nombre: string;
  password: string;
  es_admin: boolean;
  activo: boolean;
  automatizacion_ids: number[];
}

const emptyForm: UserForm = {
  username: '',
  nombre: '',
  password: '',
  es_admin: false,
  activo: true,
  automatizacion_ids: [],
};

export default function AdminUsersPage() {
  const { user, workflows } = useAuth();
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUsuarios();
      if (res.success) setUsers(res.data);
    } catch {
      /* handled by auth */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!user?.es_admin) return <Navigate to="/" replace />;

  const openNew = () => {
    setEditing({ ...emptyForm });
    setError('');
    setShowPassword(false);
  };

  const openEdit = (u: UserDetail) => {
    setEditing({
      id: u.id,
      username: u.username,
      nombre: u.nombre,
      password: '',
      es_admin: u.es_admin,
      activo: u.activo,
      automatizacion_ids: u.automatizaciones.map((a) => a.id),
    });
    setError('');
    setShowPassword(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.username.trim() || !editing.nombre.trim()) {
      setError('Usuario y nombre son requeridos');
      return;
    }
    if (!editing.id && !editing.password) {
      setError('Contraseña requerida para nuevo usuario');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: Parameters<typeof saveUsuario>[0] = {
        username: editing.username,
        nombre: editing.nombre,
        es_admin: editing.es_admin,
        activo: editing.activo,
        automatizacion_ids: editing.automatizacion_ids,
      };
      if (editing.id) payload.id = editing.id;
      if (editing.password) payload.password = editing.password;
      const res = await saveUsuario(payload);
      if (res.success) {
        setEditing(null);
        await load();
      } else {
        setError(res.message || 'Error al guardar');
      }
    } catch {
      setError('Error de conexion');
    }
    setSaving(false);
  };

  const handleDelete = async (u: UserDetail) => {
    if (u.username === 'admin') return;
    if (!confirm(`¿Desactivar usuario "${u.nombre}"?`)) return;
    await deleteUsuario(u.id);
    await load();
  };

  const toggleAutomatizacion = (id: number) => {
    if (!editing) return;
    setEditing((prev) => {
      if (!prev) return prev;
      const ids = prev.automatizacion_ids.includes(id)
        ? prev.automatizacion_ids.filter((a) => a !== id)
        : [...prev.automatizacion_ids, id];
      return { ...prev, automatizacion_ids: ids };
    });
  };

  const groupedWorkflows = groupByCategory(workflows);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">
            Gestion de Usuarios
          </h1>
        </div>
        {!editing && (
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* Edit / Create form */}
      {editing && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {editing.id ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Usuario
              </label>
              <input
                type="text"
                value={editing.username}
                onChange={(e) =>
                  setEditing({ ...editing, username: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nombre completo
              </label>
              <input
                type="text"
                value={editing.nombre}
                onChange={(e) =>
                  setEditing({ ...editing, nombre: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {editing.id ? 'Nueva contraseña (dejar vacio para no cambiar)' : 'Contraseña'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={editing.password}
                  onChange={(e) =>
                    setEditing({ ...editing, password: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.es_admin}
                  onChange={(e) =>
                    setEditing({ ...editing, es_admin: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Administrador
              </label>
              {editing.id && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.activo}
                    onChange={(e) =>
                      setEditing({ ...editing, activo: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Activo
                </label>
              )}
            </div>
          </div>

          {/* Permissions */}
          {!editing.es_admin && (
            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-slate-700">
                Automatizaciones asignadas
              </p>
              <div className="space-y-3">
                {groupedWorkflows.map((group) => (
                  <div key={group.name}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {group.name}
                    </p>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {group.items.map((wf) => (
                        <label
                          key={wf.id}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white"
                        >
                          <input
                            type="checkbox"
                            checked={editing.automatizacion_ids.includes(wf.id)}
                            onChange={() => toggleAutomatizacion(wf.id)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          {wf.nombre}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {editing.es_admin && (
            <p className="mt-4 text-sm text-slate-500">
              Los administradores ven todas las automatizaciones automaticamente.
            </p>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Rol
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Automatizaciones
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Estado
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className={!u.activo ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {u.username}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.nombre}</td>
                  <td className="px-4 py-3">
                    {u.es_admin ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        <ShieldCheck className="h-3 w-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        <Shield className="h-3 w-3" />
                        Usuario
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {u.es_admin ? (
                      <span className="text-xs text-slate-400">Todas</span>
                    ) : (
                      <span className="text-xs">
                        {u.automatizaciones.length === 0
                          ? 'Ninguna'
                          : u.automatizaciones.map((a) => a.nombre).join(', ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.activo ? (
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="inline-block h-2 w-2 rounded-full bg-slate-300" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {u.username !== 'admin' && u.activo && (
                        <button
                          onClick={() => handleDelete(u)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                          title="Desactivar"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function groupByCategory(
  workflows: WorkflowConfig[],
): { name: string; items: WorkflowConfig[] }[] {
  const map = new Map<string, WorkflowConfig[]>();
  for (const wf of workflows) {
    const cat = wf.categoria || 'General';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(wf);
  }
  return Array.from(map.entries())
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => {
      const oa = a.items[0]?.categoria_orden ?? 99;
      const ob = b.items[0]?.categoria_orden ?? 99;
      return oa - ob;
    });
}
