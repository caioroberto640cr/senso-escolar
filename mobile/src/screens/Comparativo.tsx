import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, type EscolaLista } from '../api';
import { useEtapa } from '../etapa';
import { cores, etapaLabel, toneIdeb } from '../theme';
import { Campo, Cartao, Aviso } from '../ui';

const LINHAS: { label: string; campo: keyof EscolaLista; suf?: string }[] = [
  { label: 'IDEB', campo: 'ideb' },
  { label: 'Aprovação', campo: 'taxa_aprovacao', suf: '%' },
  { label: 'Abandono', campo: 'abandono', suf: '%' },
  { label: 'Reprovação', campo: 'reprovacao', suf: '%' },
  { label: 'Nota SAEB', campo: 'nota_saeb' },
  { label: 'Distorção', campo: 'distorcao', suf: '%' },
];

export default function Comparativo() {
  const { etapa } = useEtapa();
  // dois objetos de estado distintos (escola A e escola B) — item avaliativo "useState 2+ objetos"
  const [escolaA, setEscolaA] = useState<EscolaLista | null>(null);
  const [escolaB, setEscolaB] = useState<EscolaLista | null>(null);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<EscolaLista[]>([]);

  useEffect(() => {
    if (busca.trim().length < 2) { setResultados([]); return; }
    let vivo = true;
    const t = setTimeout(() => {
      api.escolas({ etapa, q: busca.trim(), limit: 12 })
        .then((r) => vivo && setResultados(r.itens))
        .catch(() => vivo && setResultados([]));
    }, 350);
    return () => { vivo = false; clearTimeout(t); };
  }, [busca, etapa]);

  function escolher(e: EscolaLista) {
    if (!escolaA) setEscolaA(e);
    else if (!escolaB) setEscolaB(e);
    else setEscolaA(e);
    setBusca('');
    setResultados([]);
  }

  const val = (e: EscolaLista | null, campo: keyof EscolaLista) => {
    const v = e ? (e[campo] as any) : null;
    return v == null ? '—' : String(v);
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: cores.canvas }}
      data={resultados}
      keyExtractor={(e) => e.id_escola}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 14, color: cores.inkSoft }}>
            Escolha duas escolas para comparar · {etapaLabel(etapa)}
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[{ e: escolaA, set: setEscolaA }, { e: escolaB, set: setEscolaB }].map((slot, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: cores.surface, borderRadius: 12, borderWidth: 1, borderColor: slot.e ? toneIdeb(slot.e.ideb).cor : cores.line, padding: 10, minHeight: 64, justifyContent: 'center' }}>
                {slot.e ? (
                  <>
                    <Text numberOfLines={2} style={{ color: cores.ink, fontWeight: '700', fontSize: 13 }}>{slot.e.nome}</Text>
                    <Text style={{ color: cores.inkFaint, fontSize: 11 }}>{slot.e.municipio}/{slot.e.estado}</Text>
                    <Pressable onPress={() => slot.set(null)} style={{ position: 'absolute', top: 6, right: 6 }}>
                      <Ionicons name="close-circle" size={18} color={cores.inkFaint} />
                    </Pressable>
                  </>
                ) : (
                  <Text style={{ color: cores.inkFaint, textAlign: 'center' }}>Escola {i === 0 ? 'A' : 'B'}</Text>
                )}
              </View>
            ))}
          </View>

          {escolaA && escolaB && (
            <Cartao>
              {LINHAS.map((l) => {
                const a = val(escolaA, l.campo), b = val(escolaB, l.campo);
                const na = Number(a), nb = Number(b);
                const aMelhor = !isNaN(na) && !isNaN(nb) && (l.campo === 'ideb' || l.campo === 'taxa_aprovacao' || l.campo === 'nota_saeb' ? na > nb : na < nb);
                return (
                  <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: cores.line }}>
                    <Text style={{ flex: 1, textAlign: 'right', fontWeight: '700', color: aMelhor ? cores.brandDark : cores.ink }}>{a}{l.suf && a !== '—' ? l.suf : ''}</Text>
                    <Text style={{ width: 110, textAlign: 'center', color: cores.inkFaint, fontSize: 12 }}>{l.label}</Text>
                    <Text style={{ flex: 1, fontWeight: '700', color: !aMelhor && b !== '—' ? cores.brandDark : cores.ink }}>{b}{l.suf && b !== '—' ? l.suf : ''}</Text>
                  </View>
                );
              })}
            </Cartao>
          )}

          <Campo icone="search-outline" placeholder="Buscar escola para adicionar…" value={busca} onChangeText={setBusca} autoCapitalize="none" />
        </View>
      }
      ListEmptyComponent={busca.length >= 2 ? <Aviso texto="Nenhuma escola encontrada." /> : null}
      renderItem={({ item }) => (
        <Pressable onPress={() => escolher(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: cores.surface, borderRadius: 12, borderWidth: 1, borderColor: cores.line, padding: 12 }}>
          <Ionicons name="add-circle-outline" size={20} color={cores.brand} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: cores.ink, fontWeight: '600' }}>{item.nome}</Text>
            <Text style={{ color: cores.inkFaint, fontSize: 12 }}>{item.municipio}/{item.estado} · IDEB {item.ideb.toFixed(1)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}
