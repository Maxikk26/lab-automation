import { Link } from 'react-router-dom';
import {
  Layers,
  Globe,
  ArrowRight,
  FlaskConical,
  Clock,
  Upload,
  FileStack,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { WorkflowConfig } from '../types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  layers: Layers,
  globe: Globe,
  clock: Clock,
  upload: Upload,
  'file-stack': FileStack,
};

interface CategoryGroup {
  name: string;
  items: WorkflowConfig[];
}

function groupByCategory(workflows: WorkflowConfig[]): CategoryGroup[] {
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

export default function HomePage() {
  const { user, workflows } = useAuth();
  const groups = groupByCategory(workflows);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FlaskConical className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">
            Portal de Automatizacion
          </h1>
        </div>
        <p className="text-slate-600">
          Bienvenido, {user?.nombre}. Seleccione una automatizacion para subir
          archivos y procesarlos.
        </p>
      </div>

      {groups.map((group) => (
        <div key={group.name} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            {group.name}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.items.map((wf) => {
              const Icon = iconMap[wf.icono] || Layers;
              return (
                <Link
                  key={wf.id}
                  to={`/upload/${wf.id}`}
                  className="group flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="mb-1 text-lg font-semibold text-slate-900">
                    {wf.nombre}
                  </h3>

                  <p className="mb-4 flex-1 text-sm text-slate-500">
                    {wf.descripcion}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      {wf.extensiones.join(', ')} &middot; max {wf.max_archivos}{' '}
                      {wf.max_archivos === 1 ? 'archivo' : 'archivos'}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-blue-600 transition-colors group-hover:text-blue-700">
                      Subir
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {workflows.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-500">
            No tiene automatizaciones asignadas. Contacte al administrador.
          </p>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          Como funciona
        </h3>
        <ol className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              1
            </span>
            Seleccione la automatizacion correspondiente al tipo de archivo que
            desea procesar
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              2
            </span>
            Arrastre o seleccione los archivos exportados
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              3
            </span>
            Haga clic en Procesar y vea el resultado de cada archivo en tiempo
            real
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              4
            </span>
            Los resultados estaran disponibles inmediatamente en Power BI
          </li>
        </ol>
      </div>
    </div>
  );
}
