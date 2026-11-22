# Plano de implementação — Vida (Organizador de Vida)

Baseado em `Organizador de Vida — Planejamento do Projeto.md` (22/11/2026).
O roadmap original vinha num bloco embutido que não foi exportado; as fases abaixo
foram reconstruídas a partir da tabela de habilidades por fase e da seção de riscos.

Regra de ouro: **cada fase termina com 1 semana de uso real no dia a dia** antes da próxima.

---

## Fase 0 — Fundação (≈ 2 semanas)

Objetivo: o mesmo app abre no Android e no navegador, com login, banco local e sync.

| # | Entrega | Pronto quando |
|---|---------|---------------|
| 0.1 | Monorepo pnpm: `apps/app`, `packages/domain`, `supabase/`, `tools/` | `pnpm install` na raiz funciona |
| 0.2 | App Expo SDK 58 + Expo Router + TypeScript, alias `@/` | `pnpm web` abre no navegador |
| 0.3 | Design system: tokens (`shared/ui/theme`), fontes Inter + Source Serif 4, tema claro/escuro, componentes `Text`, `Button`, `Input`, `ListItem`, `Sheet`, `Chip` | Tela de demonstração nos dois temas |
| 0.4 | Navegação: 4 abas (Hoje · Notas · Finanças · Bíblia) + botão central da caixa de entrada | Navega entre abas no web e no Android |
| 0.5 | `packages/domain`: base de entidade (UUID, timestamps, `deleted_at`), Zod, `links` (parser de `[[...]]` e URIs `vida://`) com testes | `pnpm test` verde |
| 0.6 | ESLint com `eslint-plugin-boundaries` aplicando as 6 regras de importação | Import proibido quebra o lint |
| 0.7 | Supabase: projeto, CLI, primeira migração (`links`, `notes`, `tags`) com RLS, cadastro público desligado, MFA | 2º usuário de teste não enxerga nada |
| 0.8 | PowerSync: schema local, sync rules por `user_id`, conector Supabase (upload queue) | Editar offline no celular e ver no web ao reconectar |
| 0.9 | Validar import de `packages/domain` numa Edge Function Deno (import map) | Função “hello” usando uma regra do domain |
| 0.10 | `CLAUDE.md` + skills `.claude/skills/*` | Arquivos no repo |
| 0.11 | APK local (`npx expo run:android`) | APK instalado no celular |

**Depende de você:** criar contas Supabase e PowerSync (grátis) e instalar Android Studio/SDK.

## Fase 1 — Notas, links, busca e bloqueio (≈ 4 semanas) → app vira ferramenta diária

- Notas: lista, pastas, tags, fixar, editor (campo de texto + pré-visualização markdown; editor rico fica para 1.5).
- Links: tabela `links` atualizada pelo parser ao salvar, `LinkPanel` com backlinks, autocomplete ao digitar `[[`.
- Registro de tipos (`vida://note` …) na feature `links`.
- Busca universal com FTS5 (Ctrl+K no web), incluindo ações (“nova nota”).
- Lixeira (exclusão lógica).
- `app-lock`: biometria + senha do app (scrypt/argon2 via `@noble/hashes`, `expo-secure-store`), espera crescente, tela oculta em recentes.
- Tela **Hoje** (inicialmente: notas recentes e fixadas).
- Fase 1.5: editor CodeMirror 6 via Expo DOM component (`"use dom"`).

## Fase 2 — Finanças, compras e investimentos (≈ 4 semanas)

- `domain/finance/money.ts`: centavos, parcelas, formatação BRL (com testes).
- Contas, categorias, transações, orçamentos mensais; saldo por conta.
- Gráficos SVG (`react-native-gifted-charts`), monocromáticos com destaque no dado relevante.
- Compras: listas e itens; “comprei” → vira gasto com 1 toque.
- Investimentos: ativos e movimentos (aporte, resgate, rendimento, cotação manual), evolução do patrimônio.
- Hoje: gasto do mês vs. orçamento.

## Fase 3 — Agenda, lembretes e dieta (≈ 3 semanas)

- Eventos com RRULE, lembretes (`expo-notifications`, funcionando offline).
- Plano alimentar, horários, registro de refeições.
- Hoje: próximo compromisso e próxima refeição.

## Fase 4 — Bíblia e devocionais (≈ 3 semanas)

- `tools/bible-import`: USFM da Bíblia Livre → `blivre.sqlite` com FTS5 (31 mil versículos).
- Leitor em modo leitura (serifa 18), camadas: marcações, anotações, edições (restaurar/ver original), favoritos e progresso.
- Referências OSIS (`[[Jo 3:16]]` → `vida://bible/JHN.3.16`).
- Devocional (modelo SOAP), linha do tempo, lembrete diário; crédito CC BY 4.0 visível.

## Fase 5 — Galeria e mídia (≈ 2 semanas)

- Interface `MediaStore` (domain) + Edge Function `media-sign` (`SupabaseStore`; `R2Store` preparado).
- Upload em fila offline, WebP + miniatura, `![[media:id]]`, painel “usada em”.
- Avisos de cota (800 MB / 950 MB).

## Fase 6 — IA: caixa de entrada e agente (≈ 3 semanas)

- `ai-tools.ts` por feature (Zod → JSON Schema), Edge Function `ai-agent` com `AiProvider`.
- Fluxo proposta → confirmação → `ai_actions` com desfazer.
- Teto mensal de tokens; Haiku na caixa de entrada, Sonnet na conversa.
- Suite de 20 frases de teste.

## Fase 7 — Segurança nível 2, backup e exportação (≈ 2 semanas)

- GitHub Actions: `pg_dump` noturno criptografado (age), keep-alive diário, CI (lint + testes).
- Exportar tudo (.zip com .md, CSV, JSON); teste de restauração.
- SQLCipher (OP-SQLite) com chave liberada por biometria/senha; “nota trancada” (E2E opcional).
- Skill `revisao-seguranca` executada antes do release.

---

## Decisões tomadas na implementação

- **Expo SDK 58** (o mais recente; o planejamento citava o 56). Rotas ficam em `apps/app/src/app/` e features em `apps/app/src/features/` (padrão `src/` do SDK 58).
- **Estilo com `makeStyles` + tokens tipados em vez de NativeWind.** NativeWind 5 ainda está em RC e o 4 não acompanha RN 0.88/React 19.3 com segurança. Os tokens continuam num único arquivo e o ESLint barra cores hex fora dele; dá para adotar NativeWind 5 depois sem mexer nos tokens.
- **pnpm** com `node-linker=hoisted` (mais compatível com React Native).
- Web exportado como SPA (`web.output: single`), ideal para Cloudflare Pages.

## Progresso

- [x] Plano de implementação
- [x] 0.1 Monorepo pnpm
- [x] 0.2 App Expo SDK 58 + Router + TS (build web compilando)
- [x] 0.3 Design system: tokens, fontes, claro/escuro, componentes base (prévia em Ajustes)
- [x] 0.4 Navegação: 4 abas + botão da caixa de entrada
- [x] 0.5 Domain: core, links (URIs, wikilinks, diff), bible (refs pt-BR → OSIS) — 32 testes
- [x] 0.6 ESLint de fronteiras (verificado com violações propositais)
- [~] 0.7 Supabase: config local + 3 migrações com RLS validadas (PGlite). **Falta:** criar projeto na nuvem e aplicar
- [~] 0.8 PowerSync: sync rules escritas. **Falta:** conta, SDK no app, conector
- [ ] 0.9 Edge Function usando o domain
- [x] 0.10 CLAUDE.md + 6 skills
- [ ] 0.11 APK local (precisa do Android SDK)
