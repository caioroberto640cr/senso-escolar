import { useState } from 'react';
import { Card, SectionTitle } from '../components/ui/Card';
import { usuarioAtual } from '../data/mock';
import { cx } from '../lib/utils';

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cx(
        'relative h-6 w-11 rounded-full transition-colors',
        on ? 'bg-brand-500' : 'bg-brand-100'
      )}
    >
      <span
        className={cx(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          on ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

export default function Configuracoes() {
  const [prefs, setPrefs] = useState(usuarioAtual.preferencias_notificacao);
  const [seg, setSeg] = useState({ doisFatores: true, sessaoUnica: false });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
      {/* Perfil */}
      <Card>
        <SectionTitle title="Perfil" subtitle="Dados da conta" />
        <div className="flex items-center gap-4 mb-5">
          <div className="h-16 w-16 rounded-full bg-brand-200 text-brand-600 grid place-items-center text-xl font-semibold">
            {usuarioAtual.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <p className="font-semibold text-ink">{usuarioAtual.nome}</p>
            <p className="text-sm text-ink-soft">{usuarioAtual.email}</p>
            <p className="text-xs text-ink-faint capitalize mt-0.5">Perfil: {usuarioAtual.perfil}</p>
          </div>
        </div>
        <label className="block text-xs font-semibold text-ink-soft mb-1.5">Nome</label>
        <input
          defaultValue={usuarioAtual.nome}
          className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm mb-4 outline-none focus:border-brand-300"
        />
        <label className="block text-xs font-semibold text-ink-soft mb-1.5">E-mail</label>
        <input
          defaultValue={usuarioAtual.email}
          className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm mb-5 outline-none focus:border-brand-300"
        />
        <button className="rounded-xl bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors">
          Salvar alterações
        </button>
      </Card>

      <div className="space-y-6">
        {/* Notificações */}
        <Card>
          <SectionTitle title="Notificações" subtitle="Quando você quer ser avisado" />
          <div className="space-y-4">
            {[
              { key: 'quedaDesempenho', label: 'Queda de desempenho (IDEB)' },
              { key: 'aumentoEvasao', label: 'Aumento da evasão escolar' },
              { key: 'resumoSemanal', label: 'Resumo semanal por e-mail' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm text-ink">{item.label}</span>
                <Toggle
                  on={prefs[item.key as keyof typeof prefs]}
                  onChange={() =>
                    setPrefs((p) => ({ ...p, [item.key]: !p[item.key as keyof typeof prefs] }))
                  }
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Segurança */}
        <Card>
          <SectionTitle title="Segurança" subtitle="Proteção da conta" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink">Autenticação em dois fatores (2FA)</span>
              <Toggle on={seg.doisFatores} onChange={() => setSeg((s) => ({ ...s, doisFatores: !s.doisFatores }))} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink">Encerrar outras sessões ao entrar</span>
              <Toggle on={seg.sessaoUnica} onChange={() => setSeg((s) => ({ ...s, sessaoUnica: !s.sessaoUnica }))} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
