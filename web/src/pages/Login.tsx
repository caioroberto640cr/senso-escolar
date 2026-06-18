import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { cx } from '../lib/utils';

const perfis = [
  { v: 'pai', label: 'Pai / Responsável' },
  { v: 'docente', label: 'Docente' },
  { v: 'gestor', label: 'Gestor' },
];

export default function Login() {
  const { user, login, registrar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const destino = location.state?.from || '/';

  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState('pai');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [dbOff, setDbOff] = useState(false);

  // já logado? sai da tela
  useEffect(() => {
    if (user) navigate(destino, { replace: true });
  }, [user, destino, navigate]);

  // avisa se o banco não está configurado
  useEffect(() => {
    api.authStatus().then((s) => setDbOff(!s.disponivel)).catch(() => setDbOff(true));
  }, []);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      if (modo === 'entrar') await login(email, senha);
      else await registrar({ nome, email, senha, perfil });
      navigate(destino, { replace: true });
    } catch (err: any) {
      setErro(err.message || 'Algo deu errado.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-canvas">
      <div className="w-full max-w-md">
        {/* Marca */}
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-6">
          <div className="h-10 w-10 rounded-xl bg-brand-500 grid place-items-center text-white text-lg font-bold">E</div>
          <div className="leading-tight">
            <p className="font-semibold text-ink text-lg">EduInsight</p>
            <p className="text-xs text-ink-faint">BI Educacional</p>
          </div>
        </Link>

        <div className="rounded-2xl bg-surface border border-line shadow-[0_8px_24px_-16px_rgba(34,90,45,0.3)] p-6">
          {/* Abas */}
          <div className="flex rounded-xl bg-brand-50 p-1 mb-5">
            {(['entrar', 'cadastrar'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setModo(m); setErro(null); }}
                className={cx(
                  'flex-1 rounded-lg py-2 text-sm font-semibold transition-colors',
                  modo === m ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                )}
              >
                {m === 'entrar' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {dbOff && (
            <div className="mb-4 rounded-xl bg-sun-100 text-sun-500 px-3 py-2 text-xs">
              ⚠️ Cadastro/login ainda não está configurado neste servidor (falta o banco de dados).
            </div>
          )}

          <form onSubmit={enviar} className="space-y-3">
            {modo === 'cadastrar' && (
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">Nome completo</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
                  placeholder="Seu nome"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
                placeholder="voce@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            {modo === 'cadastrar' && (
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">Perfil</label>
                <div className="flex flex-wrap gap-1.5">
                  {perfis.map((p) => (
                    <button
                      type="button"
                      key={p.v}
                      onClick={() => setPerfil(p.v)}
                      className={cx(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                        perfil === p.v ? 'bg-brand-500 text-white' : 'bg-brand-50 text-ink-soft hover:bg-brand-100'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {erro && <p className="text-sm text-peach-600 bg-peach-100 rounded-xl px-3 py-2">{erro}</p>}

            <button
              type="submit"
              disabled={enviando || dbOff}
              className="w-full rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {enviando ? 'Aguarde...' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-faint mt-4">
          Entre ou crie sua conta para explorar os indicadores educacionais.
        </p>
      </div>
    </div>
  );
}
