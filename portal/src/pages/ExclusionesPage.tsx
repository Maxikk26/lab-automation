import { useEffect, useState, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { ListX, Loader2, Trash2, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchExamenesCatalogo, saveExclusion, deleteExclusion } from '../api';

interface ExamenCatalogo {
  seccion: string;
  codigo_examen: string;
  nombre_examen: string;
  excluido: boolean;
  motivo?: string;
}

const PAGE_SIZE = 30;
const itemKey = (e: ExamenCatalogo) => `${e.seccion}|${e.codigo_examen}`;

function Pagination({
  page, total, pageSize, onChange,
}: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-sm text-slate-500">
      <span>{from}–{to} de {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[60px] text-center text-xs">
          Pág {page + 1} / {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ExclusionesPage() {
  const { canEditExamenes } = useAuth();
  const [catalogo, setCatalogo] = useState<ExamenCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [filterSeccion, setFilterSeccion] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedExcluded, setSelectedExcluded] = useState<Set<string>>(new Set());
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [catalogPage, setCatalogPage] = useState(0);
  const [excludedPage, setExcludedPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchExamenesCatalogo();
      if (res.success) setCatalogo(res.data);
    } catch { /* auth handles */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset pages and excluded selection when filters change
  useEffect(() => {
    setCatalogPage(0);
    setExcludedPage(0);
    setSelectedExcluded(new Set());
  }, [searchQ, filterSeccion]);

  if (!canEditExamenes) return <Navigate to="/" replace />;

  const secciones = useMemo(
    () => [...new Set(catalogo.map((e) => e.seccion))].sort(),
    [catalogo],
  );

  const filtered = useMemo(() => {
    const q = searchQ.toLowerCase();
    return catalogo.filter((e) => {
      if (filterSeccion && e.seccion !== filterSeccion) return false;
      if (!q) return true;
      return (
        e.codigo_examen.toLowerCase().includes(q) ||
        e.nombre_examen.toLowerCase().includes(q)
      );
    });
  }, [catalogo, searchQ, filterSeccion]);

  const disponibles = filtered.filter((e) => !e.excluido);
  const excluidos = filtered.filter((e) => e.excluido);

  const catalogPageData = disponibles.slice(catalogPage * PAGE_SIZE, (catalogPage + 1) * PAGE_SIZE);
  const excludedPageData = excluidos.slice(excludedPage * PAGE_SIZE, (excludedPage + 1) * PAGE_SIZE);

  // ── Selection ────────────────────────────────────────────────────────────

  const toggleSelect = (e: ExamenCatalogo) => {
    const key = itemKey(e);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allPageSelected =
    catalogPageData.length > 0 &&
    catalogPageData.every((e) => selected.has(itemKey(e)));

  const togglePageSelection = () => {
    const pageKeys = catalogPageData.map(itemKey);
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageKeys.forEach((k) => next.delete(k));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pageKeys.forEach((k) => next.add(k));
        return next;
      });
    }
  };

  // ── Selection helpers (excluded table) ───────────────────────────────────

  const toggleSelectExcluded = (e: ExamenCatalogo) => {
    const key = itemKey(e);
    setSelectedExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allExcludedPageSelected =
    excludedPageData.length > 0 &&
    excludedPageData.every((e) => selectedExcluded.has(itemKey(e)));

  const toggleExcludedPageSelection = () => {
    const pageKeys = excludedPageData.map(itemKey);
    if (allExcludedPageSelected) {
      setSelectedExcluded((prev) => {
        const next = new Set(prev);
        pageKeys.forEach((k) => next.delete(k));
        return next;
      });
    } else {
      setSelectedExcluded((prev) => {
        const next = new Set(prev);
        pageKeys.forEach((k) => next.add(k));
        return next;
      });
    }
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleExcluir = async () => {
    const toSave = disponibles.filter((e) => selected.has(itemKey(e)));
    if (!toSave.length) return;
    setSaving(true);
    await saveExclusion(toSave.map((e) => ({
      seccion: e.seccion,
      codigo_examen: e.codigo_examen,
      nombre_examen: e.nombre_examen,
      motivo: motivo.trim() || undefined,
    })));
    setSelected(new Set());
    setMotivo('');
    setSaving(false);
    await load();
  };

  const handleQuitarSeleccionados = async () => {
    const toDelete = excluidos.filter((e) => selectedExcluded.has(itemKey(e)));
    if (!toDelete.length) return;
    setSaving(true);
    await deleteExclusion(toDelete.map((e) => ({ seccion: e.seccion, codigo_examen: e.codigo_examen })));
    setSelectedExcluded(new Set());
    setSaving(false);
    await load();
  };

  const handleRemoveOne = async (e: ExamenCatalogo) => {
    await deleteExclusion({ seccion: e.seccion, codigo_examen: e.codigo_examen });
    await load();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <ListX className="h-7 w-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900">Examenes Excluidos</h1>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Los examenes excluidos no cuentan en portafolio ni cumplimiento. Son sub-componentes que no representan pruebas independientes.
      </p>

      {/* Search + filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Buscar por codigo o nombre..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {searchQ && (
            <button
              onClick={() => setSearchQ('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={filterSeccion}
          onChange={(e) => setFilterSeccion(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Todas las secciones</option>
          {secciones.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Motivo + action bar — visible solo cuando hay seleccion */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <span className="text-sm font-medium text-red-800">
            {selected.size} examen{selected.size > 1 ? 'es' : ''} seleccionado{selected.size > 1 ? 's' : ''}
          </span>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo de exclusion (opcional)"
            className="min-w-[220px] flex-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSelected(new Set()); setMotivo(''); }}
              className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleExcluir}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ListX className="h-4 w-4" />
              )}
              Excluir seleccionados
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* ── Catalog table ─────────────────────────────────────────── */}
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <span className="text-sm font-semibold text-slate-700">
                Catalogo — {disponibles.length} examenes
                {searchQ || filterSeccion ? ' (filtrados)' : ''}
              </span>
              {disponibles.length > 0 && (
                <button
                  onClick={() => {
                    if (selected.size === disponibles.length) {
                      setSelected(new Set());
                    } else {
                      setSelected(new Set(disponibles.map(itemKey)));
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {selected.size === disponibles.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              )}
            </div>

            {disponibles.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                {searchQ || filterSeccion
                  ? 'Sin resultados para los filtros aplicados.'
                  : 'Todos los examenes ya estan excluidos o no hay datos cargados.'}
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60">
                      <th className="w-10 px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={togglePageSelection}
                          title="Seleccionar pagina actual"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Codigo</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Nombre</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Seccion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {catalogPageData.map((e) => {
                      const key = itemKey(e);
                      const isSelected = selected.has(key);
                      return (
                        <tr
                          key={key}
                          onClick={() => toggleSelect(e)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td
                            className="px-4 py-2.5 text-center"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(e)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-900">{e.codigo_examen}</td>
                          <td className="px-4 py-2.5 text-slate-700">{e.nombre_examen || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-500">{e.seccion}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <Pagination
                  page={catalogPage}
                  total={disponibles.length}
                  pageSize={PAGE_SIZE}
                  onChange={setCatalogPage}
                />
              </>
            )}
          </div>

          {/* ── Excluded table ────────────────────────────────────────── */}
          {excluidos.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-blue-200 bg-white">
              <div className="flex items-center justify-between border-b border-blue-200 bg-blue-50 px-4 py-2.5">
                <span className="text-sm font-semibold text-blue-800">
                  Exclusiones actuales — {excluidos.length} examenes
                </span>
                <div className="flex items-center gap-3">
                  {selectedExcluded.size > 0 && (
                    <button
                      onClick={handleQuitarSeleccionados}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Quitar seleccionados ({selectedExcluded.size})
                    </button>
                  )}
                  {excluidos.length > 0 && (
                    <button
                      onClick={() => {
                        if (selectedExcluded.size === excluidos.length) {
                          setSelectedExcluded(new Set());
                        } else {
                          setSelectedExcluded(new Set(excluidos.map(itemKey)));
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {selectedExcluded.size === excluidos.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                  )}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-100 bg-blue-50/40">
                    <th className="w-10 px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={allExcludedPageSelected}
                        onChange={toggleExcludedPageSelection}
                        title="Seleccionar pagina actual"
                        className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                      />
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Codigo</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Nombre</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Seccion</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Motivo</th>
                    <th className="w-14 px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {excludedPageData.map((e) => {
                    const key = itemKey(e);
                    const isSelected = selectedExcluded.has(key);
                    return (
                      <tr
                        key={key}
                        onClick={() => toggleSelectExcluded(e)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-red-50' : 'bg-blue-50/20 hover:bg-blue-50/40'}`}
                      >
                        <td className="px-4 py-2.5 text-center" onClick={(ev) => ev.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectExcluded(e)}
                            className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                          />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-900">{e.codigo_examen}</td>
                        <td className="px-4 py-2.5 text-slate-700">{e.nombre_examen || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-500">{e.seccion}</td>
                        <td className="px-4 py-2.5 italic text-slate-400">{e.motivo || '—'}</td>
                        <td className="px-4 py-2.5 text-right" onClick={(ev) => ev.stopPropagation()}>
                          <button
                            onClick={() => handleRemoveOne(e)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Quitar exclusion"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination
                page={excludedPage}
                total={excluidos.length}
                pageSize={PAGE_SIZE}
                onChange={setExcludedPage}
              />
            </div>
          )}

          {catalogo.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
              No hay examenes cargados en la base de datos.
            </div>
          )}
        </>
      )}
    </div>
  );
}
