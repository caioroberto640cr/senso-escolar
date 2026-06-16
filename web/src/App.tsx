import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import Schools from './pages/Schools';
import SchoolDetail from './pages/SchoolDetail';
import Comparativo from './pages/Comparativo';
import Relatorios from './pages/Relatorios';
import Alertas from './pages/Alertas';
import Usuarios from './pages/Usuarios';
import Fontes from './pages/Fontes';
import Configuracoes from './pages/Configuracoes';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/escolas" element={<Schools />} />
          <Route path="/escolas/:id" element={<SchoolDetail />} />
          <Route path="/comparativo" element={<Comparativo />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/alertas" element={<Alertas />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/fontes" element={<Fontes />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
