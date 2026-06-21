// Hook simples de carregamento de dados (loading/erro/recarregar).
import { useCallback, useEffect, useState } from 'react';

export function useDados<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const exec = useCallback(fn, deps);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    exec()
      .then((d) => vivo && setData(d))
      .catch((e) => vivo && setErro(e?.response?.data?.erro || e?.message || 'Falha ao carregar'))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [exec]);

  return { data, carregando, erro };
}
