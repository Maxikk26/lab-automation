import { useEffect, useState, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Target, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchMetas, saveMetaDefault, saveMetaPeriodo, deleteMetaPeriodo } from '../api';
import type { MetaSeccion } from '../types';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// flash: cellKey -> 'ok' | 'error'
type FlashStatus = 'ok' | 'error';

export default function MetasPage() {
  const { canEditMetas } = useAuth();
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [metas, setMetas] = useState<MetaSeccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDefault, setEditingDefault] = useState<{ seccion: string; value: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ seccion: string; mes: string; value: string } | null>(null);
  const [flash, setFlash] = useState<{ key: string; status: FlashStatus } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMetas(anio);
      if (res.success) setMetas(res.data);
    } catch { /* auth handles */ }
    setLoading(false);
  }, [anio]);

  useEffect(() => { load(); }, [load]);

  if (!canEditMetas) return <Navigate to="/" replace />;

  const triggerFlash = (key: string, status: FlashStatus) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash({ key, status });
    flashTimer.current = setTimeout(() => setFlash(null), 1400);
  };

  const getOverride = (m: MetaSeccion, mes: string) =>
    m.overrides.find((o) => o.mes === mes);

  // ── Default column ────────────────────────────────────────────────────────

  const commitDefault = async (seccion: string, value: string, original: number) => {
    const val = parseFloat(value);
    if (isNaN(val) || val === original) {
      setEditingDefault(null);
      return;
    }
    setEditingDefault(null);
    try {
      await saveMetaDefault(seccion, val);
      triggerFlash(`default-${seccion}`, 'ok');
      await load();
    } catch {
      triggerFlash(`default-${seccion}`, 'error');
    }
  };

  // ── Month cells ───────────────────────────────────────────────────────────

  const commitCell = async (seccion: string, mes: string, value: string) => {
    setEditingCell(null);
    const cellKey = `${seccion}-${mes}`;
    try {
      const val = parseFloat(value);
      if (isNaN(val) || value.trim() === '') {
        await deleteMetaPeriodo({ seccion, anio, mes });
      } else {
        await saveMetaPeriodo({ seccion, anio, mes, meta_dias: val });
      }
      triggerFlash(cellKey, 'ok');
      await load();
    } catch {
      triggerFlash(cellKey, 'error');
    }
  };

  // ── Rendering ─────────────────────────────────────────────────────────────

  const grouped = {
    INMUNOXXI: metas.filter((m) => m.tipo === 'INMUNOXXI'),
    REFERIDO: metas.filter((m) => m.tipo === 'REFERIDO'),
  };

  const flashClass = (key: string) => {
    if (flash?.key !== key) return '';
    return flash.status === 'ok'
      ? 'bg-emerald-100 transition-colors duration-700'
      : 'bg-red-100 transition-colors duration-700';
  };

  const renderTable = (items: MetaSeccion[], title: string) => (
    <div className="mb-8">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600 min-w-[180px]">Seccion</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600 min-w-[80px]">Default</th>
              {MESES.map((m) => (
                <th key={m} className="px-2 py-2 text-center font-semibold text-slate-600 min-w-[70px]">
                  {m.substring(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((meta) => (
              <tr key={meta.seccion}>
                <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                  {meta.seccion.trim()}
                </td>

                {/* Default cell */}
                <td className={`px-3 py-1.5 text-center ${flashClass(`default-${meta.seccion}`)}`}>
                  {editingDefault?.seccion === meta.seccion ? (
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editingDefault.value}
                      onChange={(e) => setEditingDefault({ ...editingDefault, value: e.target.value })}
                      onBlur={() => commitDefault(meta.seccion, editingDefault.value, meta.meta_default)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingDefault(null);
                      }}
                      className="w-16 rounded border border-blue-400 bg-white px-2 py-1 text-center text-sm font-medium text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setEditingDefault({ seccion: meta.seccion, value: String(meta.meta_default) })}
                      title="Click para editar"
                      className="rounded px-2 py-1 font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                    >
                      {meta.meta_default}
                    </button>
                  )}
                </td>

                {/* Month cells */}
                {MESES.map((mes) => {
                  const ovr = getOverride(meta, mes);
                  const cellKey = `${meta.seccion}-${mes}`;
                  const isEditing = editingCell?.seccion === meta.seccion && editingCell?.mes === mes;
                  return (
                    <td key={mes} className={`px-2 py-1.5 text-center ${flashClass(cellKey)}`}>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={editingCell.value}
                          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                          onBlur={() => commitCell(meta.seccion, mes, editingCell.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          placeholder="—"
                          className="w-14 rounded border border-blue-400 bg-white px-1 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => setEditingCell({ seccion: meta.seccion, mes, value: ovr ? String(ovr.meta_dias) : '' })}
                          title="Click para editar (vacío = heredar default)"
                          className={`w-full rounded px-2 py-1 text-sm ${
                            ovr
                              ? 'bg-blue-100 font-medium text-blue-800 hover:bg-blue-200'
                              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                          } focus:outline-none focus:ring-2 focus:ring-blue-400/40`}
                        >
                          {ovr ? ovr.meta_dias : '—'}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">Metas por Seccion</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAnio(anio - 1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[60px] text-center text-lg font-bold text-slate-900">{anio}</span>
          <button onClick={() => setAnio(anio + 1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <p className="mb-6 text-sm text-slate-500">
        Click en cualquier celda para editar. <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 text-xs">Enter</kbd> o click fuera guarda. <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 text-xs">Esc</kbd> cancela. Celda de mes vacía hereda el default.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {grouped.INMUNOXXI.length > 0 && renderTable(grouped.INMUNOXXI, 'InmunoXXI')}
          {grouped.REFERIDO.length > 0 && renderTable(grouped.REFERIDO, 'Referidos')}
        </>
      )}
    </div>
  );
}
