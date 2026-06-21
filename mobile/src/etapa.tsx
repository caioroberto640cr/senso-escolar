// Contexto da etapa de ensino selecionada (persistida no dispositivo).
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EtapaKey } from './theme';

const KEY = 'eduinsight.etapa';

interface EtapaCtx {
  etapa: EtapaKey;
  setEtapa: (e: EtapaKey) => void;
}
const Ctx = createContext<EtapaCtx | null>(null);

export function EtapaProvider({ children }: { children: React.ReactNode }) {
  const [etapa, setEtapaState] = useState<EtapaKey>('anos_iniciais');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === 'anos_iniciais' || v === 'anos_finais' || v === 'medio') setEtapaState(v);
    });
  }, []);

  const setEtapa = (e: EtapaKey) => {
    setEtapaState(e);
    AsyncStorage.setItem(KEY, e);
  };

  return <Ctx.Provider value={{ etapa, setEtapa }}>{children}</Ctx.Provider>;
}

export function useEtapa() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useEtapa fora do EtapaProvider');
  return c;
}
