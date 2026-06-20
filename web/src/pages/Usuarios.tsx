import { useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { Card, SectionTitle } from '../components/ui/Card';
import { Loading, ErrorState } from '../components/ui/State';
import { api, useFetch, type Conta } from '../lib/api';
import { useAuth } from '../lib/auth';
import { cx, formatData } from '../lib/utils';

const PERFIS = ['admin', 'gestor', 'analista', 'docente', 'pai'];

export default function Usuarios() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch(() => api.usuarios(), []);
  const [lista, setLista] = useState<Conta[] | null>(null);
  const [busca, setBusca] = useState('');
  const [acao, setAcao] = useState<string | null>(null);

  // usa o estado local depois da primeira carga, para refletir edições
  const usuarios = lista ?? data ?? [];

  if (error) return <ErrorState message={error} />;
  if (loading && !data) return <Loading />;

  const filtrados = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase())
  );

  async function mudarPerfil(u: Conta, perfil: string) {
    setAcao(`perfil-${u.id}`);
    try {
      const atualizado = await api.atualizarUsuario(u.id, { perfil });
      setLista((usuarios.map((x) => (x.id === u.id ? atualizado : x))));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAcao(null);
    }
  }

  async function alternarAtivo(u: Conta) {
    setAcao(`ativo-${u.id}`);
    try {
      const atualizado = await api.atualizarUsuario(u.id, { ativo: !u.ativo });
      setLista(usuarios.map((x) => (x.id === u.id ? atualizado : x)));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAcao(null);
    }
  }

  async function remover(u: Conta) {
    if (!confirm(`Remover ${u.nome}? Esta ação não pode ser desfeita.`)) return;
    setAcao(`del-${u.id}`);
    try {
      await api.removerUsuario(u.id);
      setLista(usuarios.filter((x) => x.id !== u.id));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAcao(null);
    }
  }

  return (
    <Card padded={false}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 pb-4">
        <SectionTitle title="Usuários cadastrados" subtitle={`${usuarios.length} conta(s) reais no banco`} />
        <div className="flex items-center gap-2 rounded-xl bg-surface-2 border border-line px-3">
          <IconSearch size={18} className="text-ink-faint shrink-0" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar usuário..."
            className="bg-transparent outline-none py-2 text-sm placeholder:text-ink-faint"
          />
        </div>
      </div>

      {usuarios.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-ink-soft">
          Nenhum usuário cadastrado ainda. As contas aparecem aqui conforme as pessoas se cadastram.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-faint border-y border-line bg-surface-2">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">E-mail</th>
                <th className="px-5 py-3 font-medium">Perfil</th>
                <th className="px-5 py-3 font-medium">Cadastro</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => {
                const souEu = u.id === user?.id;
                return (
                  <tr key={u.id} className="border-b border-line last:border-0 hover:bg-brand-50/50">
                    <td className="px-5 py-3 font-medium text-ink">
                      {u.nome} {souEu && <span className="text-[11px] text-ink-faint">(você)</span>}
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{u.email}</td>
                    <td className="px-5 py-3">
                      <select
                        value={u.perfil}
                        disabled={souEu || acao === `perfil-${u.id}`}
                        onChange={(e) => mudarPerfil(u, e.target.value)}
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-xs font-medium text-ink outline-none focus:border-brand-300 disabled:opacity-60"
                      >
                        {PERFIS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-ink-soft text-xs">
                      {u.criado_em ? formatData(u.criado_em) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cx(
                          'inline-flex items-center gap-1.5 text-xs font-medium',
                          u.ativo ? 'text-mint-600' : 'text-ink-faint'
                        )}
                      >
                        <span className={cx('h-2 w-2 rounded-full', u.ativo ? 'bg-mint-500' : 'bg-ink-faint')} />
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => alternarAtivo(u)}
                          disabled={souEu || acao === `ativo-${u.id}`}
                          className={cx(
                            'rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-40',
                            u.ativo ? 'text-peach-600 hover:bg-peach-100' : 'text-mint-600 hover:bg-mint-100'
                          )}
                        >
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => remover(u)}
                          disabled={souEu || acao === `del-${u.id}`}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-peach-600 hover:bg-peach-100 disabled:opacity-40"
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-4 border-t border-line">
        <p className="text-xs text-ink-faint">
          Perfis e status são gravados no banco (Neon/Postgres). Você não pode alterar a própria conta aqui.
        </p>
      </div>
    </Card>
  );
}
