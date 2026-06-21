import React, { useRef, useState } from 'react';
import { View, Text, Image, Pressable, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNav } from '../nav';
import { api } from '../api';
import { useEtapa } from '../etapa';
import { useDados } from '../useDados';
import { cores, etapaLabel, toneIdeb, UFS, BBOX_BR, ETAPAS } from '../theme';
import { Carregando, Aviso, SelectModal, Segmentos } from '../ui';

const MAPA_URL = 'https://raw.githubusercontent.com/caioroberto640cr/senso-escolar/main/brand/brasil-mapa.png';
const UF_OPCOES = [{ v: 'todas', label: 'Todos' }, ...UFS.map((u) => ({ v: u, label: u }))];

function pos(lat: number, lng: number) {
  return {
    x: ((lng - BBOX_BR.oeste) / (BBOX_BR.leste - BBOX_BR.oeste)) * 100,
    y: ((BBOX_BR.norte - lat) / (BBOX_BR.norte - BBOX_BR.sul)) * 100,
  };
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const distancia = (t: any[]) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
const centro = (t: any[]) =>
  t.length >= 2
    ? { x: (t[0].pageX + t[1].pageX) / 2, y: (t[0].pageY + t[1].pageY) / 2 }
    : { x: t[0].pageX, y: t[0].pageY };

export default function Mapa() {
  const { navegar } = useNav();
  const { etapa, setEtapa } = useEtapa();
  const [uf, setUf] = useState('todas');
  const { data, carregando, erro } = useDados(() => api.mapa({ etapa, uf, limit: 350 }), [etapa, uf]);
  const itens = (data?.itens ?? []).filter((e) => e.latitude != null && e.longitude != null);

  // transform (zoom + pan) sem libs nativas
  const aScale = useRef(new Animated.Value(1)).current;
  const aTx = useRef(new Animated.Value(0)).current;
  const aTy = useRef(new Animated.Value(0)).current;
  const cur = useRef({ scale: 1, x: 0, y: 0 }).current;
  const snap = useRef({ count: 0, dist: 0, scale: 1, x: 0, y: 0, cx: 0, cy: 0 }).current;

  const aplicarZoom = (fator: number) => {
    cur.scale = clamp(cur.scale * fator, 1, 6);
    if (cur.scale === 1) { cur.x = 0; cur.y = 0; aTx.setValue(0); aTy.setValue(0); }
    Animated.timing(aScale, { toValue: cur.scale, duration: 140, useNativeDriver: true }).start();
  };
  const resetar = () => {
    cur.scale = 1; cur.x = 0; cur.y = 0;
    Animated.parallel([
      Animated.timing(aScale, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(aTx, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(aTy, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start();
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e, g) =>
        e.nativeEvent.touches.length === 2 || Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderGrant: () => { snap.count = 0; },
      onPanResponderMove: (e) => {
        const t = e.nativeEvent.touches;
        if (t.length !== snap.count) {
          snap.count = t.length;
          snap.scale = cur.scale; snap.x = cur.x; snap.y = cur.y;
          snap.dist = t.length >= 2 ? distancia(t) : 0;
          const c = centro(t); snap.cx = c.x; snap.cy = c.y;
          return;
        }
        const c = centro(t);
        if (t.length >= 2 && snap.dist > 0) {
          cur.scale = clamp(snap.scale * (distancia(t) / snap.dist), 1, 6);
          aScale.setValue(cur.scale);
        }
        cur.x = snap.x + (c.x - snap.cx);
        cur.y = snap.y + (c.y - snap.cy);
        aTx.setValue(cur.x); aTy.setValue(cur.y);
      },
    })
  ).current;

  return (
    <View style={{ flex: 1, backgroundColor: cores.canvas, padding: 16, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ fontSize: 12, color: cores.inkFaint, flex: 1 }}>
          {carregando ? 'carregando…' : `${itens.length} escolas no mapa${data?.amostrado ? ' (amostra)' : ''}`}
        </Text>
        <SelectModal rotulo="UF" valor={uf} opcoes={UF_OPCOES} onChange={setUf} />
      </View>

      <Segmentos opcoes={ETAPAS.map((e) => ({ key: e.key, label: e.curto }))} valor={etapa} onPress={setEtapa} />

      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: cores.surface, borderRadius: 16, borderWidth: 1, borderColor: cores.line, overflow: 'hidden' }} {...pan.panHandlers}>
        <Animated.View style={{ flex: 1, transform: [{ translateX: aTx }, { translateY: aTy }, { scale: aScale }] }}>
          <Image source={{ uri: MAPA_URL }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="contain" />
          {!carregando && itens.map((e) => {
            const p = pos(e.latitude, e.longitude);
            if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) return null;
            return (
              <Pressable
                key={e.id_escola}
                onPress={() => navegar('DetalheEscola', { id: e.id_escola, nome: e.nome })}
                hitSlop={6}
                style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: 9, height: 9, borderRadius: 5, marginLeft: -4.5, marginTop: -4.5, backgroundColor: toneIdeb(e.ideb).cor, borderWidth: 1, borderColor: '#fff' }}
              />
            );
          })}
        </Animated.View>

        {carregando && <View style={{ position: 'absolute', inset: 0, justifyContent: 'center' }}><Carregando /></View>}

        {/* Controles de zoom */}
        <View style={{ position: 'absolute', right: 10, bottom: 10, gap: 8 }}>
          <BotaoZoom icone="add" onPress={() => aplicarZoom(1.6)} />
          <BotaoZoom icone="remove" onPress={() => aplicarZoom(1 / 1.6)} />
          <BotaoZoom icone="scan-outline" onPress={resetar} />
        </View>
      </View>

      {erro && <Aviso texto={erro} />}

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
        {[['Bom (≥6)', cores.brand], ['Atenção', cores.gold], ['Crítico (<4,5)', cores.coral]].map(([l, c]) => (
          <View key={l as string} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c as string }} />
            <Text style={{ fontSize: 12, color: cores.inkSoft }}>{l}</Text>
          </View>
        ))}
      </View>

      <Text style={{ textAlign: 'center', color: cores.inkFaint, fontSize: 11 }}>
        Arraste para mover · pinça ou +/− para zoom · toque num ponto p/ abrir a escola.
      </Text>
    </View>
  );
}

function BotaoZoom({ icone, onPress }: { icone: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: cores.surface, borderWidth: 1, borderColor: cores.line, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icone} size={20} color={cores.brandDark} />
    </Pressable>
  );
}
