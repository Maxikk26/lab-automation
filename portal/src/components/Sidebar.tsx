import { NavLink } from 'react-router-dom';
import {
  Home,
  Upload,
  BarChart3,
  FlaskConical,
  Users,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { WorkflowConfig } from '../types';

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

export default function Sidebar() {
  const { user, workflows, logout } = useAuth();
  const groups = groupByCategory(workflows);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (cat: string) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <FlaskConical className="h-7 w-7 text-blue-600" />
        <div className="leading-tight">
          <p className="text-sm font-bold text-slate-900">Lab InmunoXXI</p>
          <p className="text-xs text-slate-500">Portal de Automatizacion</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`
          }
        >
          <Home className="h-4 w-4" />
          Inicio
        </NavLink>

        {groups.map((group) => (
          <div key={group.name} className="mt-3">
            <button
              onClick={() => toggle(group.name)}
              className="flex w-full items-center justify-between px-2 py-1"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {group.name}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                  collapsed[group.name] ? '-rotate-90' : ''
                }`}
              />
            </button>
            {!collapsed[group.name] && (
              <div className="mt-1 space-y-0.5">
                {group.items.map((wf) => (
                  <NavLink
                    key={wf.id}
                    to={`/upload/${wf.id}`}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <Upload className="h-4 w-4" />
                    {wf.nombre}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="my-4 border-t border-slate-200" />

        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Herramientas
        </p>
        <a
          href="/n8n/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <BarChart3 className="h-4 w-4" />
          n8n - Flujos
        </a>

        {user?.es_admin && (
          <>
            <div className="my-4 border-t border-slate-200" />
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Administracion
            </p>
            <NavLink
              to="/admin/usuarios"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Users className="h-4 w-4" />
              Gestion de Usuarios
            </NavLink>
          </>
        )}
      </nav>

      <div className="border-t border-slate-200 px-3 py-3">
        <div className="flex items-center justify-between px-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-700">
              {user?.nombre}
            </p>
            <p className="text-xs text-slate-400">{user?.username}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Cerrar sesion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
