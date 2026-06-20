import { NavLink, Outlet, Link } from 'react-router-dom';
import { cx } from '../lib/utils';
import { useEtapa } from '../lib/etapa';
import { useAuth } from '../lib/auth';
import { ETAPAS } from '../types';
import { Logo } from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

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

/** Controle de conta no topo: Entrar (deslogado) ou nome + Sair (logado). */
function AuthControl() {
  const { user, sair } = useAuth();
  if (!user) {
    return (
      <Link
        to="/login"
        className="rounded-xl bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors"
      >
        Entrar
      </Link>
    );
  }
  const iniciais = user.nome.split(' ').map((n) => n[0]).slice(0, 2).join('');
  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-600 grid place-items-center text-sm font-semibold">
          {iniciais}
        </div>
        <div className="leading-tight">
          <p className="text-sm font-medium text-ink max-w-[120px] truncate">{user.nome}</p>
          <p className="text-[11px] text-ink-faint capitalize">{user.perfil}</p>
        </div>
      </div>
      <button
        onClick={sair}
        title="Sair"
        className="rounded-xl bg-brand-50 hover:bg-brand-100 px-3 py-2 text-sm font-medium text-ink-soft transition-colors"
      >
        Sair
      </button>
    </div>
  );
}

export default function Layout() {
  const { isAdmin } = useAuth();

  const itens: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/mapa', label: 'Mapa', icon: '🗺️' },
    { to: '/escolas', label: 'Escolas', icon: '🏫' },
    { to: '/comparativo', label: 'Comparativo', icon: '⚖️' },
    { to: '/explorar', label: 'Explorar', icon: '🧭' },
    { to: '/relatorios', label: 'Relatórios', icon: '📄' },
    { to: '/alertas', label: 'Alertas', icon: '🔔' },
    ...(isAdmin ? [{ to: '/usuarios', label: 'Usuários', icon: '👥' }] : []),
    { to: '/fontes', label: 'Fontes', icon: '🔌' },
    { to: '/configuracoes', label: 'Config.', icon: '⚙️' },
  ];

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 bg-surface border-b border-line">
        {/* Linha 1: marca + etapa + conta */}
        <div className="flex items-center justify-between gap-3 px-5 h-16">
          <Link to="/" aria-label="EduInsight — início">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <EtapaSelector />
            <AuthControl />
          </div>
        </div>

        {/* Linha 2: abas distribuídas igualmente */}
        <nav className="flex items-stretch overflow-x-auto border-t border-line">
          {itens.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) =>
                cx(
                  'flex-1 min-w-[78px] flex flex-col items-center justify-center gap-1 px-2 py-2.5 text-xs font-medium border-b-[3px] transition-colors',
                  isActive
                    ? 'border-brand-500 text-brand-600 bg-brand-50'
                    : 'border-transparent text-ink-soft hover:text-ink hover:bg-brand-50/60'
                )
              }
            >
              <span className="text-lg leading-none" aria-hidden="true">{it.icon}</span>
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1400px] p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
