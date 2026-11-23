# HANDOFF — plano vivo (Claude ⇄ Codex)

> Curto e sempre atualizado. Tarefas concluídas de uma funcionalidade terminada vão para `HANDOFF-arquivo.md`.
> Commits: `claude: <descrição>` ou `codex: <descrição>`.

## Objetivo atual

Concluir a **Fase 0 (fundação)** de `docs/PLANO_DE_IMPLEMENTACAO.md`. Glife, T1–T7 e T9
(movimento dos componentes e da navegação, fronteira de dados e hello Deno) estão implementados e
detalhados em `HANDOFF-arquivo.md`. Restam os contratos/login reservados ao Claude, infraestrutura
do usuário e validação Android. Não há outra tarefa disponível ao Codex neste handoff.

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

- [x] **T7 — Interfaces de repositório no domain (só Claude)** — ver "Estado atual".
- [x] **T8 — Login e-mail + senha + MFA, sessão aal2 (0.12) (só Claude)** — validada no web em 23/11 com a conta
  real (entrar, cadastrar autenticador pelo QR, código); falta o Android. Telas refeitas pelo protótipo "Glife Acesso" (T9).
- [x] **T9 — Design system Glaciar/Sinóptico + telas de acesso do protótipo (só Claude)** — ver "Estado atual".
- [ ] **0.8 PowerSync no app (só Claude)** — infraestrutura pronta (ver "Estado atual"); falta o cliente: schema local,
  conector Supabase (upload queue), repositórios de notas sobre o SQLite local.
- [ ] **Bloqueada (depende do usuário):** 0.11 APK (Android Studio).

## Estado atual

- Projeto **Glife** em `Glauber/glife/`: pacotes `@glife/*`, esquema `glife://`, IDs `app.glife.pessoal`.
- T1–T6 concluídas e arquivadas com hashes: movimento em Button/Chip/Sheet/ListItem, demo em Ajustes,
  preferência dinâmica de movimento reduzido, lint de dados e hello usando o domain real.
- Lint/typecheck verdes (contagem atualizada na linha da T7). Build web e verificações de
  interação no Edge headless passaram nos dois temas; Android e deploy ainda não validados.
- Hello: Deno check + execução real passaram; do diretório raiz é necessário informar `--config` (abaixo).
- Planejamento e protótipo na pasta pai renomeados para `Glife — Planejamento do Projeto.md` e
  `Glife — Design System.html`; referências do repositório alinhadas. R2 concluída: handoff/arquivo e roadmap
  reconciliados, com verificações finais passando e só pendências no handoff ativo.
- Nenhuma tarefa de código pela metade. Migrações SQL versionadas permanecem intactas.
- Retomada: histórico até `5d7e5e3` íntegro (`git fsck --full`), árvore limpa e 123 testes novamente verdes.
  O pedido posterior de continuar foi interrompido antes de salvar alterações. Backup completo do Git
  e dos dois documentos externos, com SHA-256: `../backups/glife-20261122-antes-retomada/`.
- R3 (`8e11852`): orientação sobre telas básicas persistida em AGENTS/CLAUDE/handoff; prototipagem pendente
  não bloqueia tarefas autorizadas. Git e documentos externos preservados e conferidos por SHA-256.
- T9 concluída: stack/modal/Ajustes consultam movimento reduzido; conteúdo das abas e indicador ativo usam
  Reanimated. A seleção da aba também é anunciada no web (`aria-selected`). Edge headless confirmou os dois
  temas, preferência dinâmica, quatro abas, modal/Ajustes sem animação ao reduzir movimento, rolagem e texto
  digitado preservados, redimensionamento e trocas rápidas. Sem novas telas ou dependências.
- Evidências e scripts de validação web preservados no backup, subpasta `retomada-validacao/`.
- T7 concluída: contratos em `@glife/domain` — `core` (RepositoryError com códigos e mensagem fixa, paginação
  keyset com cursor opaco validado, Listener/Unsubscribe), `notes` (modelo Zod de notas/pastas, `NotesRepository`,
  `NoteFoldersRepository`, regra de ciclo de pastas) e `links` (`LinksRepository`, validação de link novo).
  `@glife/domain/testing` traz suítes de contrato + implementação em memória; **a implementação PowerSync (0.8)
  deve rodar `notesRepositoryContract`/`linksRepositoryContract`**. ESLint barra `@glife/domain/testing` fora de
  testes. **187 testes** (106 domain, 52 app, 29 Supabase).

- Supabase hospedado (23/11): projeto GLIFE `<projeto-supabase>` ligado; 3 migrações aplicadas (5 tabelas com RLS
  forçado, 5 políticas cada, na publicação `powersync`). Auth via Management API: cadastro desligado, senha 12+ com
  4 classes, reautenticação para trocar senha, MFA TOTP ligado. `apps/app/.env.local` com URL + anon. Token da CLI
  com escopo só do projeto (90 dias) em `.env.supabase.local`. Falta o usuário criar a própria conta no painel.

- T8: `@glife/domain/auth` (etapas signed_out → enroll_mfa/verify_mfa → ready, código TOTP, AuthError, contrato
  `AuthService`); `features/auth` (serviço Supabase, provider, telas Entrar e Verificação, botão Sair em Ajustes via
  composição na rota); `shared/lib/supabase.ts` (sessão no SecureStore em pedaços no Android, localStorage no web).
  Rotas com `Stack.Protected`: o app só abre em `ready` (aal2). Web conferido: sem sessão, `/` e `/ajustes` levam a
  `/entrar`, sem erros no console. **226 testes**; build web ok. Login real e Android não validados.
- T9: design system novo em `docs/design-system/` (tokens, guias, componentes de referência). `tokens.ts` migrado
  (cores Glaciar, Hanken Grotesk/Crimson Pro/JetBrains Mono, pílulas, raio 16/20/30, margem 22, molas tap/standard/
  emphasis/gentle). Novos em `shared/ui`: `IconButton`, `Spinner`, `Reveal`/`riseIn`, rótulo flutuante no `Input`,
  `Section` com linha + 18 px, `TabBar` com pílula suave e + contornado. Acesso conforme o protótipo do Claude Design
  (`Glife Acesso.dc.html`): wordmark, mostrar senha, mensagens com ícone e tom, 6 casas com envio no 6º dígito, QR
  em papel claro, chave em grupos de 4 com Copiar, cabeçalho com Sair, seção Conta em Ajustes. **253 testes**.
  Entrar conferida no web (claro/escuro); Proteja/Verificação só visíveis com a conta real. Sem a transição de
  elemento compartilhado do wordmark e sem SegmentedControl em Aparência (ainda chips).

- PowerSync (23/11): projeto Glife → instância Production (US), URL em `EXPO_PUBLIC_POWERSYNC_URL`
  (`https://<instancia-powersync>.powersync.journeyapps.com`). Lê o banco com `powersync_role` (replicação +
  BYPASSRLS, só SELECT; senha do usuário, fora do repo). Client Auth = "Use Supabase Auth" (JWKS ES256 do projeto).
  Sync Streams (edição 3) publicadas a partir de `supabase/powersync/sync-streams.yaml`: dono + `aal2`;
  `supabase/tests/syncStreams.test.ts` garante que toda tabela publicada está lá com esses filtros.

## Armadilhas conhecidas
- CLI do Supabase: use `pnpm sb … --remote` (sem `--remote`, `db push` mira o Docker local). **Não** rode
  `pnpm sb config push`: o `config.toml` tem valores de desenvolvimento (confirmação de e-mail desligada, site
  127.0.0.1). Mudanças de Auth no hospedado vão pela Management API, campo a campo.

- Reanimated 4.7 na web não registra animações de entrada personalizadas (`Keyframe`, `withInitialValues`):
  o item fica com `visibility: hidden` para sempre. Use `riseIn` de `@/shared/ui` (predefinida na web).
- QR do MFA no Supabase: `data:img/svg+xml;utf-8,<?xml…?><!-- SVGo --><svg width height>` sem viewBox;
  `svgFromDataUrl` trata. Contas de Auth: criar no painel **do projeto GLIFE** (o usuário tem vários projetos).
- PowerSync: o painel usa Sync Streams (não mais `bucket_definitions`). Mudou o YAML? Republique no painel
  (Validate → Deploy). Editor Monaco: cole pela área de transferência; digitar quebra a indentação.
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

- **0.13 / Android:** dúvida de implementação da navegação resolvida pela T9; falta conferir componentes,
  transições, modal e preferência dinâmica de movimento no Android, quando o SDK/aparelho estiver disponível.
  Não marcar 0.13 completo antes dessa validação.

## Comandos

Na raiz `glife/`:

```bash
pnpm install       # dependências
pnpm lint          # ESLint (fronteiras, hex solto)
pnpm typecheck     # tsc em todos os pacotes
pnpm test          # vitest: domain, app (lint/tema) e banco (PGlite)
pnpm build:web     # export web do app (apps/app/dist)
pnpm web           # app no navegador (dev)
pnpm sb db push --remote  # CLI do Supabase com as credenciais deste projeto (.env.supabase.local)
pnpm codex         # abre o Codex já continuando a partir da próxima tarefa
```
