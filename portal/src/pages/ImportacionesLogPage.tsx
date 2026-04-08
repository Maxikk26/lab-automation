import { useEffect, useState, useCallback } from 'react';
import { FileText, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { fetchImportacionesLog } from '../api';

interface LogDetalle {
  tipo: 'OK' | 'WARNING' | 'ERROR';
  mensaje: string;
}

interface LogEntry {
  id: number;
  archivo: string;
  webhook: string;
  periodo: string | null;
  estado: 'OK' | 'WARNING' | 'ERROR';
  secciones_ok: number;
  examenes_ok: number;
  detalle: LogDetalle[] | null;
  created_at: string;
}

const ESTADO_STYLES: Record<string, string> = {
  OK:      'bg-emerald-100 text-emerald-700',
  WARNING: 'bg-amber-100 text-amber-700',
  ERROR:   'bg-red-100 text-red-700',
};

const DETALLE_STYLES: Record<string, string> = {
  OK:      'text-emerald-700',
  WARNING: 'text-amber-700',
  ERROR:   'text-red-700',
};

export default function ImportacionesLogPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [limit, setLimit] = useState(50);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (!user?.es_admin) return <Navigate to="/" replace />;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchImportacionesLog(limit, filtroEstado || undefined);
      if (res.success) setRows(res.data);
    } catch { /* auth handles */ }
    setLoading(false);
  }, [limit, filtroEstado]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <FileText className="h-7 w-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900">Log de Importaciones</h1>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {['', 'OK', 'WARNING', 'ERROR'].map((e) => (
            <button
              key={e}
              onClick={() => setFiltroEstado(e)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filtroEstado === e
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {e || 'Todos'}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">{rows.length} registros</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
          No hay registros de importacion.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Archivo</th>
                <th className="px-4 py-3">Webhook</th>
                <th className="px-4 py-3">Periodo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Secc.</th>
                <th className="px-4 py-3 text-right">Exam.</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <>
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      row.detalle && row.detalle.length > 0 ? 'cursor-pointer hover:bg-slate-50' : ''
                    }`}
                    onClick={() => row.detalle && row.detalle.length > 0 && toggleExpand(row.id)}
                  >
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmt(row.created_at)}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate text-slate-700" title={row.archivo}>{row.archivo}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{row.webhook}</td>
                    <td className="px-4 py-3 text-slate-500">{row.periodo || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_STYLES[row.estado] || ''}`}>
                        {row.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.secciones_ok}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.examenes_ok}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {row.detalle && row.detalle.length > 0 && (
                        expanded.has(row.id)
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />
                      )}
                    </td>
                  </tr>
                  {expanded.has(row.id) && row.detalle && row.detalle.length > 0 && (
                    <tr key={`${row.id}-detail`} className="bg-slate-50">
                      <td colSpan={8} className="px-6 pb-3 pt-1">
                        <ul className="space-y-1">
                          {row.detalle.map((d, i) => (
                            <li key={i} className={`text-xs ${DETALLE_STYLES[d.tipo] || 'text-slate-600'}`}>
                              <span className="font-semibold">[{d.tipo}]</span> {d.mensaje}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length >= limit && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setLimit((l) => l + 50)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cargar mas
          </button>
        </div>
      )}
    </div>
  );
}
