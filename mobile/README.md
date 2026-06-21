# EduInsight Mobile

App mobile (protótipo) dos indicadores da educação básica brasileira (IDEB, aprovação,
SAEB), consumindo a mesma API real do EduInsight (INEP/IBGE). Feito em **React Native (Expo)**.

## Tecnologias

- **React Native + Expo** (SDK 56) + **TypeScript**
- **React Navigation** — pilha (native-stack) + abas (bottom-tabs)
- **Axios** — consumo da API (`https://eduinsight-25ys.onrender.com/api`)
- **AsyncStorage** — persistência do token de sessão e preferências
- **@expo/vector-icons** (Ionicons) — ícones
- **IA: Claude (Anthropic)** — assistente, via endpoint `/api/assistente` no backend

## Telas (10)

1. **Login** · 2. **Cadastro** · 3. **Início** (panorama nacional) · 4. **Escolas** (busca + lista)
5. **Detalhe da escola** · 6. **Estados** (ranking) · 7. **Alertas** · 8. **Comparativo** (2 escolas)
9. **Assistente** (chatbot IA) · 10. **Perfil** (etapa, logout)

## Itens avaliativos atendidos

| Item | Onde |
|---|---|
| Componentes básicos (Image, Button, Text, TextInput, View) | `src/ui.tsx`, todas as telas |
| FlatList | Escolas, Estados, Alertas, Comparativo, Assistente |
| useState (2+ objetos) | Login, Comparativo (escolaA/escolaB), Assistente |
| Navegação entre páginas | `App.tsx` (pilha + abas) |
| Consumo de API (Axios) | `src/api.ts` |
| Layout/consistência | tokens em `src/theme.ts` |
| 10 telas | `src/screens/` |
| Envolver IA | Assistente (chatbot Claude) |

Ciclo de vida: **login/cadastro → operações** (consultar indicadores, escolas, comparar,
conversar com a IA). Persistência/consumo: token Bearer no AsyncStorage + dados via API.

## Rodar

```bash
cd mobile
npm install
npx expo start        # abra no Expo Go (QR-Code) ou em um emulador
```

O **assistente de IA** responde quando o servidor tiver a variável `ANTHROPIC_API_KEY`
configurada (ver `api/.env.example`). Sem a chave, ele exibe uma mensagem de indisponível.
