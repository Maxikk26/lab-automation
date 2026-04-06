import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { ListX, Plus, Loader2, Trash2, X, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchExclusiones, saveExclusion, deleteExclusion } from '../api';
import type { ExamenExcluido } from '../types';

const SECCIONES = [
  'INMUNODIAGNÓSTICO', 'HEMOSTASIA Y TROMBOSIS', 'HEMATOLOGÍA',
  'UROANÁLISIS', 'QUÍMICA', 'PRUEBAS ESPECIALES', 'LIQUIDO SINOVIAL',
  'INHIBIDOR LUPICO', 'BIOLOGIA MOLECULAR', 'CITOMETRIA',
];

interface FormState {
  seccion: string;
  codigo_examen: string;
  nombre_examen: string;
  motivo: string;
}

const emptyForm: FormState = { seccion: '', codigo_examen: '', nombre_examen: '', motivo: '' };

export default function ExclusionesPage() {
  const { canEditExamenes } = useAuth();
  const [items, setItems] = useState<ExamenExcluido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeccion, setFilterSeccion] = useState('');
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchExclusiones(filterSeccion || undefined);
      if (res.success) setItems(res.data);
    } catch { /* auth handles */ }
    setLoading(false);
  }, [filterSeccion]);

  useEffect(() => { load(); }, [load]);

  if (!canEditExamenes) return <Navigate to="/" replace />;

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.seccion || !editing.codigo_examen.trim()) {
      setError('Seccion y codigo son requeridos');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await saveExclusion(editing);
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

  const handleDelete = async (item: ExamenExcluido) => {
    if (!confirm(`¿Eliminar exclusion "${item.codigo_examen}" de ${item.seccion}?`)) return;
    await deleteExclusion({ seccion: item.seccion, codigo_examen: item.codigo_examen });
    await load();
  };

  // Group by section
  const grouped = new Map<string, ExamenExcluido[]>();
  for (const item of items) {
    const key = item.seccion.trim();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListX className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">Examenes Excluidos</h1>
        </div>
        {!editing && (
          <button
            onClick={() => { setEditing({ ...emptyForm }); setError(''); }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Agregar Exclusion
          </button>
        )}
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Los examenes excluidos no se cuentan en el portafolio ni en las vistas de cumplimiento. Son sub-componentes que no representan pruebas independientes.
      </p>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterSeccion}
          onChange={(e) => setFilterSeccion(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Todas las secciones</option>
          {SECCIONES.map((s) => (
            <option key={s} value={s}>{s.trim()}</option>
          ))}
        </select>
      </div>

      {/* Add/Edit form */}
      {editing && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Nueva Exclusion</h2>
            <button onClick={() => setEditing(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Seccion</label>
              <select
                value={editing.seccion}
                onChange={(e) => setEditing({ ...editing, seccion: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Seleccionar...</option>
                {SECCIONES.map((s) => (
                  <option key={s} value={s}>{s.trim()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Codigo de examen</label>
              <input
                type="text"
                value={editing.codigo_examen}
                onChange={(e) => setEditing({ ...editing, codigo_examen: e.target.value })}
                placeholder="Ej: 7623"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre del examen</label>
              <input
                type="text"
                value={editing.nombre_examen}
                onChange={(e) => setEditing({ ...editing, nombre_examen: e.target.value })}
                placeholder="Descripcion opcional"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Motivo</label>
              <input
                type="text"
                value={editing.motivo}
                onChange={(e) => setEditing({ ...editing, motivo: e.target.value })}
                placeholder="Ej: Sub-componente de panel"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
          No hay examenes excluidos{filterSeccion ? ` para ${filterSeccion.trim()}` : ''}.
        </div>
      ) : (
        Array.from(grouped.entries()).map(([seccion, exams]) => (
          <div key={seccion} className="mb-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">{seccion.trim()}</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Codigo</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Nombre</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Motivo</th>
                    <th className="px-4 py-2 text-right font-semibold text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {exams.map((item) => (
                    <tr key={`${item.seccion}-${item.codigo_examen}`}>
                      <td className="px-4 py-2 font-mono font-medium text-slate-900">{item.codigo_examen}</td>
                      <td className="px-4 py-2 text-slate-600">{item.nombre_examen || '—'}</td>
                      <td className="px-4 py-2 text-slate-500">{item.motivo || '—'}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleDelete(item)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
