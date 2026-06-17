import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { cx } from '../lib/utils';
import { usuarioAtual } from '../data/mock';
import { useEtapa } from '../lib/etapa';
import { ETAPAS } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const navPrincipal: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/mapa', label: 'Mapa de Escolas', icon: '🗺️' },
  { to: '/escolas', label: 'Buscar Escolas', icon: '🔍' },
  { to: '/comparativo', label: 'Análise Comparativa', icon: '⚖️' },
  { to: '/relatorios', label: 'Relatórios', icon: '📄' },
  { to: '/alertas', label: 'Alertas', icon: '🔔' },
];

const navAdmin: NavItem[] = [
  { to: '/usuarios', label: 'Usuários', icon: '👥' },
  { to: '/fontes', label: 'Fontes de Dados', icon: '🔌' },
  { to: '/configuracoes', label: 'Configurações', icon: '⚙️' },
];

const titulos: Record<string, string> = {
  '/': 'Dashboard',
  '/mapa': 'Mapa de Escolas',
  '/escolas': 'Buscar Escolas',
  '/comparativo': 'Análise Comparativa',
  '/relatorios': 'Relatórios e Exportação',
  '/alertas': 'Alertas e Notificações',
  '/usuarios': 'Gestão de Usuários',
  '/fontes': 'Gestão de Fontes de Dados',
  '/configuracoes': 'Configurações do Sistema',
};

function NavSection({ items }: { items: NavItem[] }) {
  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            cx(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-100 text-brand-600'
                : 'text-ink-soft hover:bg-brand-50 hover:text-ink'
            )
          }
        >
          <span className="text-base">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Seletor global de etapa do IDEB — dirige as consultas de todas as telas. */
function EtapaSelector() {
  const { etapa, setEtapa } = useEtapa();
  return (
    <div className="hidden sm:flex items-center rounded-full bg-brand-50 p-1">
      {ETAPAS.map((e) => (
        <button
          key={e.key}
          onClick={() => setEtapa(e.key)}
          title={e.label}
          className={cx(
            'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            etapa === e.key ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-soft hover:text-ink'
          )}
        >
          {e.curto}
        </button>
      ))}
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const titulo =
    titulos[location.pathname] ??
    (location.pathname.startsWith('/escolas/') ? 'Detalhe da Escola' : 'EduInsight');

  const iniciais = usuarioAtual.nome
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-surface border-r border-line">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-line">
          <div className="h-9 w-9 rounded-xl bg-brand-500 grid place-items-center text-white text-lg font-bold">
            E
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-ink">EduInsight</p>
            <p className="text-[11px] text-ink-faint">BI Educacional</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Principal
          </p>
          <NavSection items={navPrincipal} />

          <p className="px-3 mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Administração
          </p>
          <NavSection items={navAdmin} />
        </div>

        <div className="p-3 border-t border-line">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-brand-50 transition-colors">
            <div className="h-9 w-9 rounded-full bg-brand-200 text-brand-600 grid place-items-center text-sm font-semibold">
              {iniciais}
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-sm font-medium text-ink truncate">{usuarioAtual.nome}</p>
              <p className="text-[11px] text-ink-faint capitalize">{usuarioAtual.perfil}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 bg-surface/80 backdrop-blur border-b border-line flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-ink">{titulo}</h1>
          </div>
          <div className="flex items-center gap-3">
            <EtapaSelector />
            <button className="relative h-10 w-10 rounded-xl bg-brand-50 hover:bg-brand-100 grid place-items-center text-lg transition-colors">
              🔔
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-peach-500" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
