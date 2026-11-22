# HANDOFF — plano vivo (Claude ⇄ Codex)

> Curto e sempre atualizado. Tarefas concluídas de uma funcionalidade terminada vão para `HANDOFF-arquivo.md`.
> Commits: `claude: <descrição>` ou `codex: <descrição>`.

## Objetivo atual

Fechar a **Fase 0 (fundação)** de `docs/PLANO_DE_IMPLEMENTACAO.md`: sistema de movimento (0.13), fronteira de dados
no lint, Edge Function de validação (0.9). PowerSync (0.8), login (0.12) e APK (0.11) dependem de contas/ferramentas
do usuário ou são "(só Claude)".

## Decisões tomadas (não mudar sem motivo)

- Monorepo pnpm: `apps/app` (Expo **SDK 58** + Expo Router + TS), `packages/domain` (TS puro), `supabase/`.
- **Sem NativeWind**: estilos via `makeStyles((t) => …)` com tokens de `shared/ui/theme/tokens.ts`; nada de hex nem
  números soltos em estilos (crie token).
- Local-first: SQLite + PowerSync + Supabase. Telas não conhecem o banco: dados via interface de repositório
  (domain) implementada em `features/<f>/data`.
- Regras de importação do `CLAUDE.md` (fronteiras entre features) são checadas pelo ESLint e por testes.
- Banco: toda tabela via `vida_apply_standard` (RLS forçado, 4 políticas de dono, **MFA aal2 obrigatório**,
  `unique (id, user_id)`); FK entre tabelas do usuário é **sempre composta** `(x_id, user_id)`; funções com
  `search_path = ''`. Migração já commitada **nunca** é editada: crie outra.
- Dinheiro em centavos (inteiro). Exclusão lógica (`deleted_at`). Texto da Bíblia é somente leitura.
- Movimento: React Native **Reanimated**, molas amortecidas 200–350 ms, respeitar "reduzir movimento".
- Testes: vitest em todos os pacotes; banco testado em Postgres real via PGlite (`supabase/tests`).
- **Telas novas** só depois de perguntar ao usuário se ele quer enviar protótipo (o Claude faz essa pergunta).

## Tarefas

Formato: `- [ ] Título` + Arquivos permitidos · Aceite (verificável) · Cuidados.

- [x] **T1 — Base do movimento (0.13a)**
  - Arquivos: `apps/app/package.json`, `pnpm-lock.yaml`, `apps/app/src/shared/ui/theme/tokens.ts`,
    `apps/app/src/shared/ui/theme/ThemeProvider.tsx`, `apps/app/src/shared/ui/motion.ts` (novo),
    `apps/app/src/shared/ui/index.ts`, `apps/app/tests/motion.test.ts` (novo).
  - Aceite: `react-native-reanimated` (e `react-native-worklets`, se o SDK 58 exigir) instalados com
    `npx expo install`; token `spring` (ex.: `{ standard: { damping, stiffness, mass }, snappy: … }`) e
    `pressScale` em tokens; `motion.ts` exporta função pura `resolveSpring(kind, reduceMotion)` que devolve
    `null` (sem animação) quando `reduceMotion` é true — coberta por teste; `pnpm test`, `pnpm typecheck`,
    `pnpm lint` e `pnpm build:web` passam.
  - Cuidados: confira a instalação em https://docs.expo.dev/versions/v58.0.0/ (plugin Babel/Worklets). Não remova
    o token `motion` existente (está em uso). Sem dependências além das do Reanimated.
- [ ] **T2 — Botão e Chip que afundam ao toque (0.13b)**
  - Arquivos: `apps/app/src/shared/ui/Button.tsx`, `apps/app/src/shared/ui/Chip.tsx`.
  - Aceite: ao pressionar, escala vai a `t.size`/token `pressScale` com mola `snappy` e volta; com reduzir
    movimento, só a opacidade muda (comportamento atual); `onPress`, `disabled` e acessibilidade inalterados;
    lint/typecheck/test/build:web passam.
  - Cuidados: use `Animated.createAnimatedComponent(Pressable)` ou `Animated.View` interno; nenhum número solto.
- [ ] **T3 — Sheet que desliza (0.13c)**
  - Arquivos: `apps/app/src/shared/ui/Sheet.tsx`.
  - Aceite: folha entra de baixo (mola `standard`) e o fundo (scrim) faz fade; ao fechar, sai ao contrário;
    reduzir movimento = aparece sem animação; lint/typecheck/test/build:web passam.
  - Cuidados: não bloquear toque durante a animação; manter `accessibilityViewIsModal`/fechamento atuais.
- [ ] **T4 — Lista que se reorganiza + demo em Ajustes (0.13d)**
  - Arquivos: `apps/app/src/shared/ui/ListItem.tsx`, `apps/app/src/features/settings/screens/SettingsScreen.tsx`.
  - Aceite: `ListItem` aceita entrar/sair com animação de layout (Reanimated `LinearTransition` + fade);
    na seção "Design system" de Ajustes, uma lista de exemplo com botões "Adicionar" e "Remover" mostra itens
    entrando, saindo e o resto se reorganizando; reduzir movimento = sem animação; lint/typecheck/test/build:web.
  - Cuidados: é só uma demo dentro da tela existente (não criar tela nova). Textos em pt-BR.
- [ ] **T5 — Lint: banco só na camada de dados**
  - Arquivos: `apps/app/eslint.config.js`, `apps/app/tests/boundaries.test.ts`.
  - Aceite: import de `@powersync/*` ou `@supabase/*` é erro fora de `src/features/*/data/**` e `src/shared/lib/**`;
    novos casos em `boundaries.test.ts` (barra em `features/notes/screens/x.ts`, permite em
    `features/notes/data/x.ts` e `shared/lib/x.ts`), vistos falhando antes da regra; `pnpm test` e `pnpm lint` passam.
  - Cuidados: os pacotes ainda não estão instalados; use `no-restricted-imports` com `patterns` (não depende de
    resolver o módulo). Não mexa nas políticas de `boundaries/dependencies` existentes.
- [ ] **T6 — Edge Function "hello" usando o domain (0.9)**
  - Arquivos: `supabase/functions/hello/index.ts`, `supabase/functions/hello/handler.ts`,
    `supabase/functions/deno.json`, `supabase/tests/hello.test.ts`.
  - Aceite: `handler(req: Request): Promise<Response>` lê `?ref=Jo 3:16`, usa `parseBibleRef`/`toOsis` do domain
    e responde `{ "osis": "JHN.3.16" }` (400 com mensagem para ref inválida/ausente); `index.ts` só faz
    `Deno.serve(handler)`; `deno.json` mapeia o domain por caminho relativo; teste vitest chama `handler` com
    `new Request(...)` cobrindo válido, inválido e ausente; `pnpm test` passa.
  - Cuidados: o domain já usa imports com `.ts` (compatível com Deno). Nada de segredos. Se `deno` estiver
    instalado, rode também `deno check supabase/functions/hello/index.ts`; se não, registre em Dúvidas.
- [ ] **T7 — Interfaces de repositório no domain (só Claude)**
  - Decisão de arquitetura (contratos de `NotesRepository`, `LinksRepository`, erros, paginação).
- [ ] **T8 — Login e-mail + senha + MFA, sessão aal2 (0.12) (só Claude)**
  - Autenticação. Depende do projeto Supabase hospedado.
- [ ] **Bloqueadas (dependem do usuário):** 0.8 PowerSync (contas Supabase/PowerSync), 0.11 APK (Android Studio),
  aplicar migrações no projeto hospedado.

## Estado atual

- Fase 0: monorepo, design system, navegação, domain (55 testes), ESLint de fronteiras (19 testes no app),
  migrações com RLS/MFA/FKs compostas (20 testes de banco), tema persistido, tokens completos.
- T1 concluída: instalação Expo conferida (Reanimated 4.7.1/Worklets 0.13.0 já presentes), tokens de mola/escala,
  `resolveSpring` (6 testes) e preferência de movimento acompanhando alterações do sistema. Lint, typecheck,
  100 testes e build web passaram. Babel configurado automaticamente pelo `babel-preset-expo` do SDK 58.
- Próximo pedido do usuário: renomear o app/sistema para **Glife**, incluindo arquivos e pastas necessários.
- Nenhuma tarefa pela metade.

## Armadilhas conhecidas

- Windows: rode comandos na raiz `vida/`. Avisos "LF will be replaced by CRLF" do git são inofensivos.
- `python -m http.server` (ou servidor estático simples) dá 404 ao recarregar rotas como `/notas`; navegue a
  partir de `/`.
- Screenshots logo após trocar de aba pegam a transição no meio; espere ~1 s antes de concluir que algo "sumiu".
- Libs do Expo/RN: sempre `cd apps/app && npx expo install <pkg>` (versões do SDK 58). A API do Expo muda por SDK:
  consulte a documentação v58, não a memória.
- Testes de banco aplicam todas as migrações num PGlite novo: SQL incompatível quebra `pnpm test`.
- `packages/domain` não pode importar React/Expo/Supabase/PowerSync (teste `boundaries.test.ts` barra).

## Dúvidas para o Claude

_(nenhuma)_

## Comandos

Na raiz `vida/`:

```bash
pnpm install       # dependências
pnpm lint          # ESLint (fronteiras, hex solto)
pnpm typecheck     # tsc em todos os pacotes
pnpm test          # vitest: domain, app (lint/tema) e banco (PGlite)
pnpm build:web     # export web do app (apps/app/dist)
pnpm web           # app no navegador (dev)
pnpm codex         # abre o Codex já continuando a partir da próxima tarefa
```
