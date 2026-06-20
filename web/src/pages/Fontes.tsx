import { useEffect, useState } from 'react';
import { IconRefresh, IconPlug } from '@tabler/icons-react';
import { Card, SectionTitle } from '../components/ui/Card';
import { api, type FonteDados } from '../lib/api';
import { Loading, ErrorState } from '../components/ui/State';
import { cx } from '../lib/utils';

const statusInfo: Record<string, { label: string; dot: string; text: string }> = {
  conectado: { label: 'Conectado', dot: 'bg-mint-500', text: 'text-mint-600' },
  sincronizando: { label: 'Sincronizando…', dot: 'bg-sun-500 animate-pulse', text: 'text-sun-500' },
  erro: { label: 'Erro', dot: 'bg-peach-500', text: 'text-peach-600' },
};

export default function Fontes() {
  const [fontes, setFontes] = useState<FonteDados[] | null>(null);
  const [verificadoEm, setVerificadoEm] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null); // 'all' | id da fonte
  const [logAberto, setLogAberto] = useState<Set<string>>(new Set());

  async function carregar(marca?: string) {
    setErro(null);
    if (marca) setOcupado(marca);
    else setCarregando(true);
    // feedback imediato no card clicado
    if (marca && marca !== 'all') {
      setFontes((prev) => prev?.map((f) => (f.id === marca ? { ...f, status: 'sincronizando' } : f)) ?? prev);
    }
    try {
      const r = await api.fontes();
      setFontes(r.fontes);
      setVerificadoEm(r.verificado_em);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregando(false);
      setOcupado(null);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleLog(id: string) {
    setLogAberto((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  if (carregando) return <Loading />;
  if (erro && !fontes) return <ErrorState message={erro} />;

  const fmtData = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="space-y-5">
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SectionTitle
          title="Integrações de dados"
          subtitle="Status real das bases oficiais (INEP, SAEB, Censo, IBGE) usadas pela plataforma"
        />
        <div className="flex items-center gap-3 whitespace-nowrap">
          {verificadoEm && (
            <span className="text-xs text-ink-faint">Verificado em {fmtData(verificadoEm)}</span>
          )}
          <button
            onClick={() => carregar('all')}
            disabled={!!ocupado}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            <IconRefresh size={16} className={ocupado === 'all' ? 'animate-spin' : ''} />
            {ocupado === 'all' ? 'Verificando…' : 'Verificar todas'}
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fontes!.map((f) => {
          const s = statusInfo[f.status] ?? statusInfo.erro;
          const ocupada = ocupado === f.id || ocupado === 'all' || f.status === 'sincronizando';
          const logVisivel = logAberto.has(f.id);
          return (
            <Card key={f.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-brand-100 text-brand-600 grid place-items-center"><IconPlug size={22} /></div>
                  <div>
                    <h3 className="font-semibold text-ink">{f.nome}</h3>
                    <span className={cx('inline-flex items-center gap-1.5 text-xs font-medium mt-0.5', s.text)}>
                      <span className={cx('h-2 w-2 rounded-full', s.dot)} />
                      {s.label}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-ink-faint bg-surface-2 rounded-full px-2 py-0.5">
                  {f.categoria}
                </span>
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

              {logVisivel && (
                <div className="rounded-xl bg-surface-2 border border-line p-3 mb-4 text-xs text-ink-soft leading-relaxed">
                  {f.detalhe}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => carregar(f.id)}
                  disabled={ocupada}
                  className={cx(
                    'flex-1 rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-60',
                    f.status === 'erro'
                      ? 'bg-peach-100 text-peach-600 hover:bg-peach-200'
                      : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                  )}
                >
                  {ocupada
                    ? 'Verificando…'
                    : f.status === 'erro'
                      ? 'Tentar novamente'
                      : 'Sincronizar agora'}
                </button>
                <button
                  onClick={() => toggleLog(f.id)}
                  className="rounded-xl bg-surface-2 border border-line px-3 py-2 text-sm font-medium text-ink-soft hover:bg-brand-50 transition-colors"
                >
                  {logVisivel ? 'Ocultar' : 'Ver log'}
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="bg-surface-2">
        <p className="text-sm text-ink-soft leading-relaxed">
          <strong className="text-ink">Adicionar dados futuros:</strong> novas bases ou anos (ex.: IDEB 2025) entram
          pelo pipeline de ETL — <code className="text-brand-600">npm run etl</code> baixa/processa os arquivos do INEP
          e <code className="text-brand-600">npm run seed</code> carrega no Postgres. Ao concluir, clique em{' '}
          <strong className="text-ink">“Verificar todas”</strong> para refletir aqui. O <em>Sincronizar</em> reconsulta
          o estado real de cada fonte (contagem no banco e conectividade do IBGE).
        </p>
      </Card>
    </div>
  );
}
