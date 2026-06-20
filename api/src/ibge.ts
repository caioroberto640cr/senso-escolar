// Serviço de geografia — API pública do IBGE (ao vivo, com cache em memória)
const BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades';

type CacheEntry = { data: unknown; expira: number };
const cache = new Map<string, CacheEntry>();
const TTL = 1000 * 60 * 60 * 12; // 12h

async function cached<T>(chave: string, url: string): Promise<T> {
  const hit = cache.get(chave);
  if (hit && hit.expira > Date.now()) return hit.data as T;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`IBGE ${res.status}`);
  const data = (await res.json()) as T;
  cache.set(chave, { data, expira: Date.now() + TTL });
  return data;
}

export async function estados() {
  const data = await cached<any[]>('estados', `${BASE}/estados?orderBy=nome`);
  return data.map((e) => ({
    id: e.id,
    sigla: e.sigla,
    nome: e.nome,
    regiao: e.regiao?.nome,
  }));
}

export async function regioes() {
  return cached<any[]>('regioes', `${BASE}/regioes`);
}

export async function municipios(uf: string) {
  const data = await cached<any[]>(
    `mun-${uf}`,
    `${BASE}/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`
  );
  return data.map((m) => ({ id: m.id, nome: m.nome }));
}

/** Checa, ao vivo (sem cache), se a API do IBGE está respondendo. */
export async function disponivel(timeoutMs = 4000): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/regioes`, { signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/** Contorno do Brasil (GeoJSON do país inteiro) — usado para recortar o mapa (cache 12h). */
export async function malhaPais() {
  return cached<any>(
    'malha-br',
    'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=intermediaria'
  );
}

/** Malha (GeoJSON) dos estados, com sigla/nome embutidos nas features (cache 12h). */
export async function malhaEstados() {
  const geo = await cached<any>(
    'malha-uf',
    'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF'
  );
  const ests = await estados();
  const porCod = new Map(ests.map((e) => [String(e.id), e]));
  for (const f of geo.features ?? []) {
    const e = porCod.get(String(f.properties?.codarea));
    if (e) { f.properties.sigla = e.sigla; f.properties.nome = e.nome; }
  }
  return geo;
}
