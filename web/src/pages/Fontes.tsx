import { Card, SectionTitle } from '../components/ui/Card';
import { fontes } from '../data/mock';
import { cx } from '../lib/utils';

const statusInfo: Record<string, { label: string; dot: string; text: string }> = {
  conectado: { label: 'Conectado', dot: 'bg-mint-500', text: 'text-mint-600' },
  sincronizando: { label: 'Sincronizando', dot: 'bg-sun-500', text: 'text-sun-500' },
  erro: { label: 'Erro', dot: 'bg-peach-500', text: 'text-peach-600' },
};

export default function Fontes() {
  return (
    <div className="space-y-5">
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SectionTitle
          title="Integrações de dados"
          subtitle="APIs governamentais e bases oficiais (INEP, MEC, SAEB, secretarias)"
        />
        <button className="rounded-xl bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap">
          + Nova fonte
        </button>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fontes.map((f) => {
          const s = statusInfo[f.status];
          return (
            <Card key={f.nome}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-brand-100 grid place-items-center text-xl">
                    🔌
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink">{f.nome}</h3>
                    <span className={cx('inline-flex items-center gap-1.5 text-xs font-medium mt-0.5', s.text)}>
                      <span className={cx('h-2 w-2 rounded-full', s.dot)} />
                      {s.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-line pt-3 mb-4">
                <div>
                  <p className="text-[11px] text-ink-faint">Última atualização</p>
                  <p className="text-sm font-medium text-ink">{f.ultima}</p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-faint">Registros</p>
                  <p className="text-sm font-medium text-ink">{f.registros}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className={cx(
                    'flex-1 rounded-xl py-2 text-sm font-medium transition-colors',
                    f.status === 'erro'
                      ? 'bg-peach-100 text-peach-600 hover:bg-peach-200'
                      : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                  )}
                >
                  {f.status === 'erro' ? 'Tentar novamente' : 'Sincronizar agora'}
                </button>
                <button className="rounded-xl bg-surface-2 border border-line px-3 py-2 text-sm font-medium text-ink-soft hover:bg-brand-50 transition-colors">
                  Ver log
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
