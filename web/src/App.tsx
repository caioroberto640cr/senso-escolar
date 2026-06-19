import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import Schools from './pages/Schools';
import SchoolDetail from './pages/SchoolDetail';
import Comparativo from './pages/Comparativo';
import Explorar from './pages/Explorar';
import Relatorios from './pages/Relatorios';
import Alertas from './pages/Alertas';
import Usuarios from './pages/Usuarios';
import Fontes from './pages/Fontes';
import Configuracoes from './pages/Configuracoes';
import Login from './pages/Login';
import { useAuth } from './lib/auth';
import { Loading } from './components/ui/State';

/** Exige usuário logado; senão manda para /login guardando a origem. */
function RequireAuth({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, carregando, isAdmin } = useAuth();
  const location = useLocation();
  if (carregando)
    return (
      <div className="min-h-screen grid place-items-center">
        <Loading label="Carregando..." />
      </div>
    );
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (adminOnly && !isAdmin)
    return (
      <div className="rounded-2xl bg-surface border border-line p-8 text-center">
        <p className="text-2xl mb-2">🔒</p>
        <p className="font-semibold text-ink">Acesso restrito</p>
        <p className="text-sm text-ink-soft mt-1">Esta área é exclusiva para administradores.</p>
      </div>
    );
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/escolas" element={<Schools />} />
          <Route path="/escolas/:id" element={<SchoolDetail />} />
          <Route path="/comparativo" element={<Comparativo />} />
          <Route path="/explorar" element={<Explorar />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/alertas" element={<Alertas />} />
          <Route path="/fontes" element={<Fontes />} />
          <Route
            path="/usuarios"
            element={
              <RequireAuth adminOnly>
                <Usuarios />
              </RequireAuth>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <RequireAuth>
                <Configuracoes />
              </RequireAuth>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
