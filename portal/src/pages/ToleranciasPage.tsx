import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { Gauge, Loader2, Save, Pencil, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchTolerancias, saveTolerancia } from '../api';
import type { ConfigTolerancia } from '../types';

export default function ToleranciasPage() {
  const { canEditMetas } = useAuth();
  const [config, setConfig] = useState<ConfigTolerancia | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    umbral_en_rango: '',
    umbral_alerta: '',
    umbral_critico: '',
    umbral_dias_cumple: '',
    umbral_dias_alerta: '',
    umbral_dias_critico: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchTolerancias();
      if (res.success && res.data.length > 0) {
        // Find global default (anio IS NULL)
        const global = res.data.find((d: ConfigTolerancia) => d.anio === null) || res.data[0];
        setConfig(global);
      }
    } catch { /* auth handles */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!canEditMetas) return <Navigate to="/" replace />;

  const startEdit = () => {
    if (!config) return;
    setForm({
      umbral_en_rango: String(Math.round(Number(config.umbral_en_rango) * 100)),
      umbral_alerta: String(Math.round(Number(config.umbral_alerta) * 100)),
      umbral_critico: String(Math.round(Number(config.umbral_critico) * 100)),
      umbral_dias_cumple: String(Number(config.umbral_dias_cumple)),
      umbral_dias_alerta: String(Number(config.umbral_dias_alerta)),
      umbral_dias_critico: String(Number(config.umbral_dias_critico)),
    });
    setEditing(true);
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await saveTolerancia({
        anio: null,
        mes: null,
        umbral_en_rango: parseFloat(form.umbral_en_rango) / 100,
        umbral_alerta: parseFloat(form.umbral_alerta) / 100,
        umbral_critico: parseFloat(form.umbral_critico) / 100,
        umbral_dias_cumple: parseFloat(form.umbral_dias_cumple),
        umbral_dias_alerta: parseFloat(form.umbral_dias_alerta),
        umbral_dias_critico: parseFloat(form.umbral_dias_critico),
      });
      if (res.success) {
        setEditing(false);
        await load();
      } else {
        setError(res.message || 'Error al guardar');
      }
    } catch {
      setError('Error de conexion');
    }
    setSaving(false);
  };

  const pct = (v: number | string) => `${Math.round(Number(v) * 100)}%`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Gauge className="h-7 w-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900">Tolerancias</h1>
      </div>

      <p className="mb-6 text-sm text-slate-500">
        Configuracion global de umbrales para el semaforo de portafolio (% de pruebas fuera de meta) y el semaforo de examenes individuales (dias absolutos).
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : !config ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
          No hay configuracion de tolerancias.
        </div>
      ) : editing ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Editar Tolerancias</h2>
            <button onClick={() => setEditing(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <h3 className="mb-3 text-sm font-semibold text-slate-700">Portafolio (% fuera de meta)</h3>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-emerald-700">En Rango (max %)</label>
              <div className="flex items-center gap-1">
                <input type="number" step="1" value={form.umbral_en_rango}
                  onChange={(e) => setForm({ ...form, umbral_en_rango: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                <span className="text-sm text-slate-500">%</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-amber-700">Alerta (max %)</label>
              <div className="flex items-center gap-1">
                <input type="number" step="1" value={form.umbral_alerta}
                  onChange={(e) => setForm({ ...form, umbral_alerta: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                <span className="text-sm text-slate-500">%</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-red-700">Critico (por encima de)</label>
              <div className="flex items-center gap-1">
                <input type="number" step="1" value={form.umbral_critico}
                  onChange={(e) => setForm({ ...form, umbral_critico: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                <span className="text-sm text-slate-500">%</span>
              </div>
            </div>
          </div>

          <h3 className="mb-3 text-sm font-semibold text-slate-700">Examenes (dias absolutos)</h3>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-emerald-700">Cumple (max dias)</label>
              <input type="number" step="0.5" value={form.umbral_dias_cumple}
                onChange={(e) => setForm({ ...form, umbral_dias_cumple: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-amber-700">Alerta (max dias)</label>
              <input type="number" step="0.5" value={form.umbral_dias_alerta}
                onChange={(e) => setForm({ ...form, umbral_dias_alerta: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-red-700">Critico (por encima de)</label>
              <input type="number" step="0.5" value={form.umbral_dias_critico}
                onChange={(e) => setForm({ ...form, umbral_dias_critico: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Portafolio card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Portafolio — % fuera de meta</h2>
              <button onClick={startEdit} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Editar">
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-xs font-medium uppercase text-emerald-600">En Rango</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{pct(config.umbral_en_rango)}</p>
                <p className="text-xs text-emerald-500">o menos</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-center">
                <p className="text-xs font-medium uppercase text-amber-600">Alerta</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{pct(config.umbral_alerta)}</p>
                <p className="text-xs text-amber-500">o menos</p>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-center">
                <p className="text-xs font-medium uppercase text-red-600">Critico</p>
                <p className="mt-1 text-2xl font-bold text-red-700">&gt;{pct(config.umbral_critico)}</p>
                <p className="text-xs text-red-500">por encima</p>
              </div>
            </div>
          </div>

          {/* Examenes card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Examenes — dias absolutos</h2>
              <button onClick={startEdit} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Editar">
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-xs font-medium uppercase text-emerald-600">Cumple</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{Number(config.umbral_dias_cumple)}</p>
                <p className="text-xs text-emerald-500">dias o menos</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-center">
                <p className="text-xs font-medium uppercase text-amber-600">Alerta</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{Number(config.umbral_dias_alerta)}</p>
                <p className="text-xs text-amber-500">dias o menos</p>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-center">
                <p className="text-xs font-medium uppercase text-red-600">Critico</p>
                <p className="mt-1 text-2xl font-bold text-red-700">&gt;{Number(config.umbral_dias_critico)}</p>
                <p className="text-xs text-red-500">dias</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
