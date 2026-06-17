import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { EtapaKey } from '../types';

interface EtapaCtx {
  etapa: EtapaKey;
  setEtapa: (e: EtapaKey) => void;
}

const Ctx = createContext<EtapaCtx | null>(null);
const STORAGE = 'eduinsight.etapa';
const PADRAO: EtapaKey = 'anos_iniciais';

export function EtapaProvider({ children }: { children: ReactNode }) {
  const [etapa, setEtapaState] = useState<EtapaKey>(() => {
    const v = localStorage.getItem(STORAGE);
    return v === 'anos_iniciais' || v === 'anos_finais' || v === 'medio' ? v : PADRAO;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE, etapa);
  }, [etapa]);

  return <Ctx.Provider value={{ etapa, setEtapa: setEtapaState }}>{children}</Ctx.Provider>;
}

export function useEtapa(): EtapaCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useEtapa precisa estar dentro de <EtapaProvider>');
  return c;
}
