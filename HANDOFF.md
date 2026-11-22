# HANDOFF — plano vivo (Claude ⇄ Codex)

> Curto e sempre atualizado. Tarefas concluídas de uma funcionalidade terminada vão para `HANDOFF-arquivo.md`.
> Commits: `claude: <descrição>` ou `codex: <descrição>`.

## Objetivo atual

Concluir a **Fase 0 (fundação)** de `docs/PLANO_DE_IMPLEMENTACAO.md`. Glife e as entregas T1–T6
(componentes de movimento, fronteira de dados e hello Deno) estão prontas e detalhadas em
`HANDOFF-arquivo.md`. Restam os contratos/login reservados ao Claude, infraestrutura do usuário
e o escopo de navegação/abas do item 0.13 (ver Dúvidas).

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

## Orientação posterior do usuário (22/11/2026)

- "Construa o básico e deixe pendente a prototipagem": telas previstas nas tarefas podem avançar sem
  aguardar protótipos. Esta orientação substitui o bloqueio por protótipo acima; cada tela básica deve
  manter a prototipagem registrada como pendente. As demais reservas e dependências continuam válidas.

## Tarefas

Formato: `- [ ] Título` + Arquivos permitidos · Aceite (verificável) · Cuidados.

- [ ] **T7 — Interfaces de repositório no domain (só Claude)**
  - Decisão de arquitetura (contratos de `NotesRepository`, `LinksRepository`, erros, paginação).
- [ ] **T8 — Login e-mail + senha + MFA, sessão aal2 (0.12) (só Claude)**
  - Autenticação. Depende do projeto Supabase hospedado.
- [ ] **Bloqueadas (dependem do usuário):** 0.8 PowerSync (contas Supabase/PowerSync), 0.11 APK (Android Studio),
  aplicar migrações no projeto hospedado.

- [ ] **T9 — Navegação com movimento reduzido (0.13e)**
  - Arquivos: layouts de `src/app/`, `src/shared/navigation/`, `apps/app/tests/navigationMotion.test.ts`,
    `HANDOFF.md`, `HANDOFF-arquivo.md`, `docs/PLANO_DE_IMPLEMENTACAO.md`.
  - Aceite: stack, modal e Ajustes sem animação ao reduzir movimento; abas com entrada Reanimated e
    indicador ativo que desliza, sem movimento quando a preferência estiver ligada; navegação e estado
    das telas preservados; lint/typecheck/test/build:web e interação web nos dois temas passam.
  - Cuidados: nenhuma dependência ou tela nova; tokens existentes; mudança dinâmica de acessibilidade;
    não marcar 0.13 completo antes de validar no Android.

## Estado atual

- Projeto **Glife** em `Glauber/glife/`: pacotes `@glife/*`, esquema `glife://`, IDs `app.glife.pessoal`.
- T1–T6 concluídas e arquivadas com hashes: movimento em Button/Chip/Sheet/ListItem, demo em Ajustes,
  preferência dinâmica de movimento reduzido, lint de dados e hello usando o domain real.
- Lint/typecheck verdes; **123 testes** (55 domain, 39 app, 29 Supabase). Build web e verificações de
  interação no Edge headless passaram nos dois temas; Android e deploy ainda não validados.
- Hello: Deno check + execução real passaram; do diretório raiz é necessário informar `--config` (abaixo).
- Planejamento e protótipo na pasta pai renomeados para `Glife — Planejamento do Projeto.md` e
  `Glife — Design System.html`; referências do repositório alinhadas. R2 concluída: handoff/arquivo e roadmap
  reconciliados, com verificações finais passando e só pendências no handoff ativo.
- Nenhuma tarefa de código pela metade. Migrações SQL versionadas permanecem intactas.
- Retomada: histórico até `5d7e5e3` íntegro (`git fsck --full`), árvore limpa e 123 testes novamente verdes.
  O pedido posterior de continuar foi interrompido antes de salvar alterações. Backup completo do Git
  e dos dois documentos externos, com SHA-256: `../backups/glife-20261122-antes-retomada/`.
- R3 concluída: orientação sobre telas básicas persistida em AGENTS/CLAUDE/handoff; prototipagem pendente
  não bloqueia tarefas autorizadas. Lint/typecheck/123 testes passaram; próxima tarefa possível: T9.

## Armadilhas conhecidas

- Windows: rode comandos na raiz `glife/`. Avisos "LF will be replaced by CRLF" do git são inofensivos.
- `python -m http.server` (ou servidor estático simples) dá 404 ao recarregar rotas como `/notas`; navegue a
  partir de `/`.
- Screenshots logo após trocar de aba pegam a transição no meio; espere ~1 s antes de concluir que algo "sumiu".
- Libs do Expo/RN: sempre `cd apps/app && npx expo install <pkg>` (versões do SDK 58). A API do Expo muda por SDK:
  consulte a documentação v58, não a memória.
- Testes de banco aplicam todas as migrações num PGlite novo: SQL incompatível quebra `pnpm test`.
- `packages/domain` não pode importar React/Expo/Supabase/PowerSync (teste `boundaries.test.ts` barra).
- Deno, na raiz: `deno check --config supabase/functions/deno.json supabase/functions/hello/index.ts`.
  Sem `--config`, o Deno não descobre o import map dentro de `supabase/functions` a partir da raiz.

## Dúvidas para o Claude

- **0.13 / navegação:** T1–T4 cobrem componentes e demo, mas o roadmap também menciona abas deslizando e
  movimento reduzido em toda navegação. `src/app/_layout.tsx` ainda configura animações de stack sem consultar
  a preferência e a TabBar não tem transição Reanimated; esses arquivos não eram permitidos nas tarefas.
  Falta definir tarefa para a navegação (desligar animações com `useReduceMotion` e escolher a transição de abas)
  e validar no Android. O item 0.13 completo ainda não deve ser marcado como finalizado.

## Comandos

Na raiz `glife/`:

```bash
pnpm install       # dependências
pnpm lint          # ESLint (fronteiras, hex solto)
pnpm typecheck     # tsc em todos os pacotes
pnpm test          # vitest: domain, app (lint/tema) e banco (PGlite)
pnpm build:web     # export web do app (apps/app/dist)
pnpm web           # app no navegador (dev)
pnpm codex         # abre o Codex já continuando a partir da próxima tarefa
```
