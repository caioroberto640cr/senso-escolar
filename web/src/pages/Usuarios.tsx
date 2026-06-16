import { useState } from 'react';
import { Card, SectionTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { cx } from '../lib/utils';

interface U {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
}

const usuariosSeed: U[] = [
  { id: '1', nome: 'Ramires Machârue', email: 'ramires@edu.gov.br', perfil: 'Gestor', ativo: true },
  { id: '2', nome: 'Caio Roberto Teixeira', email: 'caio@edu.gov.br', perfil: 'Admin', ativo: true },
  { id: '3', nome: 'Altacir Neto', email: 'altacir@edu.gov.br', perfil: 'Analista', ativo: true },
  { id: '4', nome: 'Maria Fernanda Lima', email: 'maria.lima@escola.sp.br', perfil: 'Docente', ativo: true },
  { id: '5', nome: 'João Pedro Souza', email: 'jpedro@familia.com', perfil: 'Pai/Responsável', ativo: false },
  { id: '6', nome: 'Ana Clara Ribeiro', email: 'ana.ribeiro@mec.gov.br', perfil: 'Analista', ativo: true },
];

const perfilTone: Record<string, 'brand' | 'mint' | 'sky' | 'sun' | 'neutral'> = {
  Admin: 'brand',
  Gestor: 'sky',
  Analista: 'mint',
  Docente: 'sun',
  'Pai/Responsável': 'neutral',
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState(usuariosSeed);
  const [busca, setBusca] = useState('');

  const lista = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase())
  );

  function toggleAtivo(id: string) {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ativo: !u.ativo } : u)));
  }

  return (
    <Card padded={false}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 pb-4">
        <SectionTitle title="Usuários da plataforma" subtitle={`${usuarios.length} cadastrados`} />
        <div className="flex gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 border border-line px-3">
            <span>🔍</span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar usuário..."
              className="bg-transparent outline-none py-2 text-sm placeholder:text-ink-faint"
            />
          </div>
          <button className="rounded-xl bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap">
            + Novo usuário
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-faint border-y border-line bg-surface-2">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">E-mail</th>
              <th className="px-5 py-3 font-medium">Perfil</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0 hover:bg-brand-50/50">
                <td className="px-5 py-3 font-medium text-ink">{u.nome}</td>
                <td className="px-5 py-3 text-ink-soft">{u.email}</td>
                <td className="px-5 py-3">
                  <Badge tone={perfilTone[u.perfil] ?? 'neutral'}>{u.perfil}</Badge>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={cx(
                      'inline-flex items-center gap-1.5 text-xs font-medium',
                      u.ativo ? 'text-mint-600' : 'text-ink-faint'
                    )}
                  >
                    <span
                      className={cx('h-2 w-2 rounded-full', u.ativo ? 'bg-mint-500' : 'bg-ink-faint')}
                    />
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button className="rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100">
                      Editar
                    </button>
                    <button
                      onClick={() => toggleAtivo(u.id)}
                      className={cx(
                        'rounded-lg px-2.5 py-1 text-xs font-medium',
                        u.ativo
                          ? 'text-peach-600 hover:bg-peach-100'
                          : 'text-mint-600 hover:bg-mint-100'
                      )}
                    >
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
