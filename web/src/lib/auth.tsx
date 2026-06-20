import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type Conta } from './api';

// O token de sessão vive num cookie httpOnly (inacessível ao JS). Aqui só
// guardamos um cache do perfil (dado não sensível) para evitar "piscar" na UI.
const USER_KEY = 'eduinsight.user';

interface AuthCtx {
  user: Conta | null;
  carregando: boolean;
  isAdmin: boolean;
  login: (email: string, senha: string) => Promise<void>;
  registrar: (d: { nome: string; email: string; senha: string; perfil?: string }) => Promise<void>;
  sair: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

function lerUser(): Conta | null {
  try {
    const v = localStorage.getItem(USER_KEY);
    return v ? (JSON.parse(v) as Conta) : null;
  } catch {
    return null;
  }
}

function salvar(user: Conta) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Conta | null>(lerUser);
  const [carregando, setCarregando] = useState(true);

  // valida a sessão ao abrir: o cookie httpOnly (se houver) autentica o /me.
  useEffect(() => {
    api
      .me()
      .then((r) => {
        setUser(r.usuario);
        salvar(r.usuario);
      })
      .catch(() => {
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => setCarregando(false));
  }, []);

  async function login(email: string, senha: string) {
    const r = await api.login(email, senha);
    salvar(r.usuario);
    setUser(r.usuario);
  }

  async function registrar(d: { nome: string; email: string; senha: string; perfil?: string }) {
    const r = await api.registrar(d);
    salvar(r.usuario);
    setUser(r.usuario);
  }

  async function sair() {
    await api.logout().catch(() => { /* limpa o cliente de qualquer forma */ });
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, carregando, isAdmin: user?.perfil === 'admin', login, registrar, sair }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return c;
}
