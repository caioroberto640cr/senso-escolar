// Componentes de UI reutilizáveis do app (Image, Text, View, Button, TextInput).
import React from 'react';
import {
  View, Text, TextInput, Pressable, Image, ActivityIndicator, Modal, ScrollView, StyleSheet,
  type TextInputProps, type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from './theme';

// Logo servida por URL (evita binários no projeto — compatível com Expo Snack).
const LOGO_URL = 'https://raw.githubusercontent.com/caioroberto640cr/senso-escolar/main/brand/logo.png';

/** Marca do EduInsight: logo (Image) + wordmark em duas cores. */
export function Logo({ tamanho = 40, comTexto = true }: { tamanho?: number; comTexto?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Image
        source={{ uri: LOGO_URL }}
        style={{ width: tamanho, height: tamanho, borderRadius: tamanho * 0.28, backgroundColor: cores.brand }}
        resizeMode="contain"
        accessibilityLabel="EduInsight"
      />
      {comTexto && (
        <View>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>
            <Text style={{ color: cores.brandDark }}>Edu</Text>
            <Text style={{ color: cores.ink }}>Insight</Text>
          </Text>
          <Text style={{ fontSize: 11, color: cores.inkFaint }}>BI Educacional</Text>
        </View>
      )}
    </View>
  );
}

export function Cartao({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.cartao, style]}>{children}</View>;
}

export function Botao({
  titulo, onPress, variante = 'primario', icone, desabilitado, carregando,
}: {
  titulo: string; onPress?: () => void;
  variante?: 'primario' | 'suave' | 'contorno';
  icone?: keyof typeof Ionicons.glyphMap; desabilitado?: boolean; carregando?: boolean;
}) {
  const fundo = variante === 'primario' ? cores.brand : variante === 'suave' ? cores.brand50 : 'transparent';
  const corTexto = variante === 'primario' ? '#fff' : cores.brandDark;
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado || carregando}
      style={({ pressed }) => [
        s.botao,
        { backgroundColor: fundo, opacity: desabilitado ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: variante === 'contorno' ? 1 : 0, borderColor: cores.line },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={corTexto} />
      ) : (
        <>
          {icone && <Ionicons name={icone} size={18} color={corTexto} />}
          <Text style={{ color: corTexto, fontWeight: '700', fontSize: 15 }}>{titulo}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Campo({
  label, icone, ...props
}: TextInputProps & { label?: string; icone?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={s.label}>{label}</Text>}
      <View style={s.campoBox}>
        {icone && <Ionicons name={icone} size={18} color={cores.inkFaint} />}
        <TextInput
          placeholderTextColor={cores.inkFaint}
          style={s.input}
          {...props}
        />
      </View>
    </View>
  );
}

export function Metrica({ label, valor, unidade, cor }: { label: string; valor: string | number; unidade?: string; cor?: string }) {
  return (
    <View style={s.metrica}>
      <Text style={{ fontSize: 12, color: cores.inkSoft }}>{label}</Text>
      <Text style={{ fontSize: 22, fontWeight: '700', color: cor ?? cores.ink, marginTop: 2 }}>
        {valor}
        {unidade ? <Text style={{ fontSize: 13, color: cores.inkFaint }}> {unidade}</Text> : null}
      </Text>
    </View>
  );
}

export function Etiqueta({ texto, cor = cores.brand }: { texto: string; cor?: string }) {
  return (
    <View style={{ backgroundColor: cor + '22', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text style={{ color: cor, fontSize: 11, fontWeight: '700' }}>{texto}</Text>
    </View>
  );
}

/** Seletor em pílulas (ex.: etapa de ensino). */
export function Segmentos<T extends string>({
  opcoes, valor, onPress,
}: { opcoes: { key: T; label: string }[]; valor: T; onPress: (k: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: cores.brand50, borderRadius: 999, padding: 4 }}>
      {opcoes.map((o) => {
        const ativo = o.key === valor;
        return (
          <Pressable key={o.key} onPress={() => onPress(o.key)}
            style={{ flex: 1, borderRadius: 999, paddingVertical: 7, alignItems: 'center', backgroundColor: ativo ? cores.brand : 'transparent' }}>
            <Text style={{ color: ativo ? '#fff' : cores.inkSoft, fontWeight: '700', fontSize: 12 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Seletor em dropdown (Modal) — para listas longas como UF. */
export function SelectModal({
  rotulo, valor, opcoes, onChange,
}: { rotulo: string; valor: string; opcoes: { v: string; label: string }[]; onChange: (v: string) => void }) {
  const [aberto, setAberto] = React.useState(false);
  const sel = opcoes.find((o) => o.v === valor);
  return (
    <>
      <Pressable
        onPress={() => setAberto(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: cores.surface, borderWidth: 1, borderColor: cores.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}
      >
        <Text style={{ fontSize: 13, color: cores.ink, fontWeight: '600' }}>{rotulo}: {sel?.label ?? valor}</Text>
        <Ionicons name="chevron-down" size={14} color={cores.inkFaint} />
      </Pressable>
      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
        <Pressable onPress={() => setAberto(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 28 }}>
          <View style={{ backgroundColor: cores.surface, borderRadius: 16, maxHeight: '70%', overflow: 'hidden' }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: cores.ink, padding: 14 }}>{rotulo}</Text>
            <ScrollView>
              {opcoes.map((o) => {
                const ativo = o.v === valor;
                return (
                  <Pressable key={o.v} onPress={() => { onChange(o.v); setAberto(false); }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: ativo ? cores.brand50 : 'transparent' }}>
                    <Text style={{ color: ativo ? cores.brandDark : cores.ink, fontWeight: ativo ? '700' : '400' }}>{o.label}</Text>
                    {ativo && <Ionicons name="checkmark" size={18} color={cores.brand} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={cores.brand} size="large" />
      <Text style={{ color: cores.inkFaint }}>{texto}</Text>
    </View>
  );
}

export function Aviso({ texto }: { texto: string }) {
  return (
    <View style={{ padding: 16, alignItems: 'center' }}>
      <Ionicons name="alert-circle-outline" size={28} color={cores.coral} />
      <Text style={{ color: cores.inkSoft, marginTop: 6, textAlign: 'center' }}>{texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  cartao: {
    backgroundColor: cores.surface, borderRadius: 16, borderWidth: 1, borderColor: cores.line,
    padding: 14,
  },
  botao: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16,
  },
  label: { fontSize: 12, fontWeight: '700', color: cores.inkSoft },
  campoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: cores.surface, borderWidth: 1, borderColor: cores.line,
    borderRadius: 14, paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: cores.ink },
  metrica: {
    flex: 1, backgroundColor: cores.surface, borderRadius: 14, borderWidth: 1, borderColor: cores.line,
    padding: 12, minWidth: 140,
  },
});
