# HANDOFF — plano vivo (Claude ⇄ Codex)

> Curto e sempre atualizado. Tarefas concluídas de uma funcionalidade terminada vão para `HANDOFF-arquivo.md`.
> Commits: `claude: <descrição>` ou `codex: <descrição>`.

## Objetivo atual

Concluir a **Fase 0 (fundação)** de `docs/PLANO_DE_IMPLEMENTACAO.md`. Glife, T1–T7 e T9
(movimento dos componentes e da navegação, fronteira de dados e hello Deno) estão implementados e
detalhados em `HANDOFF-arquivo.md`. Login + MFA (T8) e PowerSync hospedado prontos. Agora: **0.8 sincronização
no app** — T11 e T12 são do Codex; T10 e T13 do Claude. Android (0.11) depende do usuário.

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
- Bloqueio: o app **não** se esconde na lista de apps recentes e prints ficam liberados (usuário, 24/11/2026).
  **Pendência futura** (o usuário pode decidir implementar): esconder o conteúdo nos recentes. O protótipo
  `Glife Bloqueio` (seção 05) já desenha o cartão: Android 13+ `setRecentsScreenshotEnabled(false)`; antes disso,
  desenhar a camada de bloqueio ao ir para o segundo plano; prints continuam liberados (sem FLAG_SECURE).
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
### 0.8 — sincronização no app (infraestrutura PowerSync pronta; ver "Estado atual")

T11 e T12 foram assumidas pelo Claude a pedido do usuário (23/11). **Codex: não pegue T11–T13.**

- [x] **T10 — Cliente PowerSync e conector Supabase (só Claude)** — `shared/lib/powersync/`: `database.ts`
  (op-sqlite, Android) / `database.web.ts` (wa-sqlite em worker; `public/@powersync` copiado no postinstall),
  `connector.ts` (token só `aal2`; fila de CRUD → Supabase; erros 22xxx/23xxx/42501 descartados, resto repetido),
  `lifecycle.ts` (`ready` conecta, verificação pausa, sair apaga o banco local), `localSync.ts` (composição).
  `_layout.tsx` chama `createLocalSync({})` — **as tabelas entram na T13** com os schemas da T11. A implementação
  de `LocalDb` sobre o PowerSync também ficou para a T13 (a interface é da T11). Web conferido: `glife.db` criado
  no IndexedDB, sem erros. **Conexão real validada no web (23/11)**: logs do PowerSync mostram "Sync stream
  started" com o usuário da conta, bucket `user_data` e checkpoint completo (0 operações: banco ainda vazio).
  O gráfico "Clients Connected Now" do painel atrasa; confira pelos Logs. Android não validado.
- [x] **T11 — Interface `LocalDb` e schema local (Claude)** — `@glife/domain/core` `LocalDb`; schemas em
  `features/notes/data/schema.ts` e `features/links/data/schema.ts`; `tests/localSchema.test.ts` compara com as migrações.
  Arquivos: `packages/domain/src/core/localDb.ts` (+ export em `core/index.ts`), `apps/app/src/features/notes/data/schema.ts`,
  `apps/app/src/features/links/data/schema.ts`, `apps/app/tests/localSchema.test.ts`,
  `apps/app/package.json` (só para adicionar `@powersync/common`, via `npx expo install` ou `pnpm add`).
  Aceite: `LocalDb` em TS puro com `getAll<T>(sql, params)`, `getOptional<T>`, `execute`, `writeTransaction(fn)`
  e `watch(sql, params, onRows, onError): Unsubscribe`; schemas locais (formato `@powersync/common` `Table`/`column`,
  sem importar o SDK no domain) para `notes`, `note_folders`, `links`, `tags`, `entity_tags`; teste que compara as
  colunas de cada schema com o `create table` das migrações (falha se a migração ganhar coluna e o schema não).
  Cuidados: `id` é implícito no PowerSync (não declarar); booleanos viram `integer`, timestamps `text`, JSON `text`.
- [x] **T12 — Repositórios de notas e links sobre `LocalDb` (Claude)** — `localNotesRepository.ts`,
  `localLinksRepository.ts`, paginação em `shared/lib/localPaging.ts`; os contratos passam sobre sql.js
  (`tests/localRepositories.test.ts`). Busca e título comparados em JS (o `lower()` do SQLite ignora acentos).
  Arquivos: `apps/app/src/features/notes/data/localNotesRepository.ts`, `apps/app/src/features/links/data/localLinksRepository.ts`,
  `apps/app/tests/support/sqliteLocalDb.ts` (adaptador de teste com `better-sqlite3` ou `sql.js`, dev dependency),
  `apps/app/tests/localRepositories.test.ts`.
  Aceite: `notesRepositoryContract` e `linksRepositoryContract` (de `@glife/domain/testing`) passam contra as
  implementações locais, como já passam contra as de memória; `pnpm lint`, `pnpm typecheck`, `pnpm test` verdes.
  Cuidados: SQL só com parâmetros (`?`), nunca concatenação; `user_id` sempre gravado; exclusão lógica
  (`deleted_at`); paginação por cursor como no contrato; `@glife/domain/testing` só em testes (o lint barra).
- [x] **T13 — Notas no banco local, sincronizando (só Claude)** — `toLocalDb` (adaptador PowerSync → `LocalDb`),
  `createLocalSync({ ...notesTables, ...linksTables })` no `_layout` (banco existe mesmo sem URL; só não conecta),
  `AuthState.userId`, `NotesProvider`/`useNotesData`/`useNoteList`, lista (busca, filtros, `NoteRow`) e editor
  (`/nota/[id]`, salva sozinho, fixar, lixeira, nota vazia é descartada ao sair). **Validado no web com a conta
  real**: nota criada e editada chegou ao Supabase; exclusão lógica também. Android não validado.
  Prototipagem pendente: `docs/prototipos/notas.md` (editor escrever/ler, vínculos `[[`, pastas/tags, lixeira).
- [ ] **0.11 APK** — APK 0.1.0 (arm64, release com chave de depuração) gerado em 23/11 a partir de `fc8acc3`
  e enviado ao usuário; receita do Windows (caminhos longos) na skill `release-android`. **Falta o teste no
  celular** (abrir, entrar com MFA, criar nota offline, sincronizar, busca) e a `revisao-seguranca` antes de uma
  release de verdade (esta foi uma build de teste, sem changelog nem chave de release).

### Fase 1 — Notas (protótipo "Glife Notas" do Claude Design)
- [x] **T14 — Notas conforme o protótipo (só Claude)** — lista (busca, filtros por tipo e #tag, linha Pastas com
  resumo, Lixeira com contagem, linhas que entram em cascata e recolhem), Pastas/Pasta (um nível, tags como filtro,
  vazios), Lixeira (Restaurar com toast "Desfazer", Esvaziar com confirmação = exclusão definitiva), editor (barra
  com tipo/Ler-Escrever/fixar/⋮, título vira barra ao rolar, pasta e tags em pílulas, "Salvando… / Salvo / Salvo no
  aparelho", Ler com markdown e Vínculos/Mencionada em, [[ com sugestões e "Nova nota: …", barra de formatação no
  Android, folhas Tipo/Mais/Pasta/Tags). Domain: `TagsRepository` + contrato, `countTrash`/`emptyTrash`.
  `syncNoteLinks` grava os [[ ]] na tabela links ao salvar. **Validado no web com a conta real.** Android não.
- [ ] Pendências do protótipo: transição "card que vira tela" (lista → editor) com elemento compartilhado; navegação
  superior no web (≥ 720 px) no lugar da barra de abas; realce dos marcadores markdown no modo Escrever; atalhos de
  teclado no web (Ctrl+B etc.); "Mover notas para cá" na pasta vazia; chips de vínculo nas linhas da lista.

### Fase 1 — Busca universal (desenho: `docs/superpowers/specs/2026-11-23-busca-universal-design.md`)

Ordem obrigatória (cada uma usa a anterior). **Codex: não pegue T15–T19** (Claude em andamento, 23/11).

- [x] **T15 — Domain `search`** — `packages/domain/src/search/{index,query,model}.ts` + `__tests__/search.test.ts`.
  Aceite: `normalizeText('Café ÇÃO')==='cafe cao'`; `toFtsQuery('café  com')==='"café"* AND "com"*'`,
  `toFtsQuery('  ')===null`, aspas viram `""`, `-`/`OR`/`*`/`(` não viram operadores; `matchActions(actions, 'fin')`
  acha "Ir para Finanças" sem acento/maiúscula, campo vazio devolve todas; `mergeResults` agrupa na ordem
  Ações → Notas → Pastas → Tags, cada grupo com limite. Tipos `SearchHit {group,id,title,snippet?,meta?,href}`,
  `SearchSource {group, search(q, limit), recent?(limit)}`, `SearchAction {id,label(q),keywords,href(q)}`.
  Cuidados: TS puro, imports com `.ts`.
- [x] **T16 — SQLite dos testes com FTS5** — `apps/app/tests/support/sqliteLocalDb.ts` passa a `node:sqlite` e
  imita o PowerSync: `ps_data__<t>(id TEXT PRIMARY KEY NOT NULL, data TEXT)` + view `<t>` com `json_extract` e
  gatilhos INSTEAD OF; tira `sql.js`/`@types/sql.js`. Aceite: contratos de notas/links/tags seguem verdes.
- [x] **T17 — Índice FTS5 no banco local (só Claude)** — `shared/lib/powersync/searchIndex.ts`
  (`FtsIndexSpec`, `ensureSearchIndexes(db, specs) → {available}`, `dropSearchIndexes(db, specs)`), chamado em
  `localSync.apply` (`ready` instala; `signed_out` apaga), `"op-sqlite": {"fts5": true}` no `apps/app/package.json`,
  `tests/searchIndex.test.ts`. Aceite: insere/edita/apaga/`REPLACE` em `ps_data__notes` refletem no índice;
  "cafe" acha "Café"; repetir não duplica; gatilho faltando → recria e repreenche; drop não deixa tabela.
  Cuidados: nenhum texto pessoal sobrevive ao sair; sem FTS5 → `available:false`, sem erro.
- [x] **T18 — Fontes de busca** — notes: `features/notes/data/notesSearch.ts` (`createNotesSearchSource`,
  `createFoldersSearchSource`, `notesSearchIndex`); links: `features/links/data/tagsSearch.ts`
  (`createTagsSearchSource`); `tests/searchSources.test.ts`. Aceite: título pesa mais que o corpo, excluídas não
  aparecem, trecho com o termo marcado, sem índice cai para `notes.list({search})`, `recent` = mais recentes.
- [ ] **T19 — Tela de busca + Ctrl+K** — `features/search/` (`SearchScreen`, `SearchProvider`, `useSearchShortcut`),
  rota `app/busca.tsx` (modal), `app/nota/nova.tsx` (`?titulo=`), `/notas?tag=<id>`, lupa em Hoje e Notas,
  composição no `_layout`. `docs/prototipos/busca.md` (prototipagem pendente). Aceite: no web, Ctrl+K abre,
  digitar acha nota com/sem acento, Enter abre o primeiro, Esc fecha; "Nova nota: x" cria com título x; dois temas.
  **Código commitado (`fc8acc3`); falta validar no web com login do usuário.**

### Fase 1 — Tela Hoje (protótipo "Glife Hoje" do Claude Design, variante 2a "Recolhido")

- [ ] **T20 — Hoje conforme o protótipo** — `features/today` (tela, linha "módulos não configurados",
  `shouldReplayEntrance`), `features/notes` (`TodayNotesBlock`, `useTodayNotes`, `pickTodayNotes`),
  `features/inbox` (`TodayInboxBlock`), `shared/lib/dates.ts` (`relativeDay`); testes em `apps/app/tests`.
  Aceite: cabeçalho com data, "Hoje", lupa (web: pílula "Buscar Ctrl K") e ajustes; primeiro uso mostra a frase de
  contexto; Caixa ("Nada pendente." + "Anotar algo"); Notas (fixadas primeiro, depois recentes, até 5; título,
  data "hoje/ontem/há N dias/12 nov", prévia de 1 linha; "Ver todas" ou "Nova nota"); linha final dos módulos
  → Ajustes; cascata de 40 ms ao abrir e ao voltar à aba depois de 30 min. Fora (pendente): card que expande até a
  nota, navegação superior no web, blocos de agenda/refeição/gastos/devocional (chegam com os módulos), itens da caixa
  (sem tabela ainda). **Código commitado (`05c0949`); falta validar no web com login do usuário.**

### Fase 1 — Bloqueio do app (regras no planejamento, seção "Bloqueio do app"; telas do protótipo Claude Design "Glife Bloqueio")

**Codex: não pegue T21–T26** (segurança; Claude, 24/11).

- [x] **T21 — Domain `applock` (só Claude)** — `packages/domain/src/applock/` + testes. `appPasswordSchema` (6–128),
  `lockoutFor(falhas)` (5º erro → 30 s; 7º → 5 min; ≥ 10 → só com login da conta; ajustado ao protótipo na T26), `shouldLockOnReturn`, registro
  `AppLockRecord` (zod), interfaces `AppLockStore`/`PasswordHasher` e serviço `createAppLock` (definir, trocar
  confirmando a atual, desbloquear por senha, redefinir após login da conta, biometria liga/desliga, tempo para
  bloquear, "pedir a senha uma vez" após digital nova). Aceite: testes com loja em memória e hasher falso cobrem
  esperas, trava em 10, sucesso zera erros, troca exige a atual, senha nunca guardada em texto.
- [x] **T22 — Hash scrypt e loja segura (só Claude)** — `features/app-lock/data/` (`createScryptHasher` com
  `@noble/hashes`, sal aleatório de 16 bytes, comparação em tempo constante; `createSecureAppLockStore`:
  SecureStore no Android, localStorage no web). Aceite: verifica a senha certa, recusa a errada, sais diferentes
  geram hashes diferentes, parâmetros vão no registro.
- [x] **T23 — Lixeira apaga de vez após 30 dias** — `NotesRepository.purgeTrash(deletedBefore)` + `trashCutoff()` no contrato,
  memória e SQLite local; chamado quando o acesso fica `ready`. Aceite: nota excluída há 31 dias some, há 29 fica.
- [x] **T24 — Portão do bloqueio por AppState (só Claude)** — domain `applock/gate.ts` (`createLockGate`: começa
  travado; segundo plano → anota a hora; volta → trava se passou do tempo; ignora o segundo plano causado pelo
  próprio diálogo de biometria) + hook `features/app-lock/hooks/useLockGate.ts` (AppState). **Ainda não ligado no
  `_layout`**: sem a tela de bloqueio, travaria o app. Aceite: testes do portão com relógio falso.
- [x] **T25 — Biometria do aparelho (só Claude)** — domain `applock/biometrics.ts` (interface `DeviceBiometrics`
  e fluxos `enableBiometrics`, `disableBiometrics`, `tryBiometricUnlock`, `unlockWithPasswordAndRearm`) +
  `features/app-lock/data/deviceBiometrics.ts` (`expo-local-authentication` para disponibilidade; uma sentinela no
  SecureStore com `requireAuthentication` faz o diálogo e detecta digital nova: chave invalidada lê `null`).
  Aceite: testes dos fluxos com biometria falsa (digital nova → pede senha uma vez e rearma; cancelar → senha).
  Código nativo do expo-secure-store conferido (T26): `BiometricPrompt` com `CryptoObject` (só biometria forte,
  **sem PIN**), e chave invalidada (`KeyPermanentlyInvalidatedException`) lê `null`. **Conferir no celular** mesmo assim.
- [x] **T26 — Telas do bloqueio (só Claude)** — protótipo "Glife Bloqueio" (Claude Design). `AppLockProvider` +
  `AppLockGate` no `_layout` (sessão `ready` → nada aparece sem desbloqueio; 1ª abertura só monta o app depois de
  liberar; ao voltar, a tela cobre o app e esmaece ao liberar). Telas: bloqueio (biometria automática, senha,
  erro com tremor e vibração, espera com contagem do prazo, travado, digital nova), criar a senha (+ oferta da
  biometria no Android), Ajustes › Segurança (`/seguranca`: sempre ligado, biometria, "Bloquear depois de"),
  trocar a senha (`/trocar-senha`, erro da atual conta no contador). "Esqueci a senha"/"Entrar com a conta" saem
  da conta (folha de confirmação) e, sem sessão, o registro é apagado (`AppLock.forget`): o próximo login cria
  outra senha. Biometria vale durante a espera da senha (não com o app travado). `Switch` novo no design system.
  Aceite: testes de `lockText` e do domain; lint/typecheck verdes. **Pendente:** testar no web com login e no
  Android (APK); o botão negativo da folha de biometria é o "Cancelar" do sistema (o expo-secure-store não deixa
  trocar para "Usar senha do app"; cancelar já leva à senha); a contagem usa o relógio do aparelho, não o tempo
  decorrido.

## Pendências do usuário

- [ ] Trocar a senha do `powersync_role` (foi escrita na conversa e é fraca): no SQL Editor do Supabase GLIFE,
  `alter role powersync_role password '<nova>';`, depois PowerSync → Database Connection → editar → nova senha →
  Test Connection → Save. Apagar a consulta do histórico do SQL Editor.

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

- Supabase hospedado (23/11): projeto GLIFE `<projeto-supabase>` (ver `INFRA.local.md`) ligado; 3 migrações aplicadas (5 tabelas com RLS
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
  (`https://<instancia-powersync>.powersync.journeyapps.com`, ver `INFRA.local.md`). Lê o banco com `powersync_role` (replicação +
  BYPASSRLS, só SELECT; senha do usuário, fora do repo). Client Auth = "Use Supabase Auth" (JWKS ES256 do projeto).
  Sync Streams (edição 3) publicadas a partir de `supabase/powersync/sync-streams.yaml`: dono + `aal2`;
  `supabase/tests/syncStreams.test.ts` garante que toda tabela publicada está lá com esses filtros.

- GitHub (23/11): `github.com/glauber2k2/Glife`, **público**, branch `master`. Histórico reescrito antes do 1º
  envio (identificadores fora, autor com e-mail noreply); cópia do histórico antigo só local em
  `backup/antes-da-publicacao` (não enviar). Hashes citados antes de 23/11 neste arquivo e no arquivo-morto são do
  histórico antigo.

## Armadilhas conhecidas
- CLI do Supabase: use `pnpm sb … --remote` (sem `--remote`, `db push` mira o Docker local). **Não** rode
  `pnpm sb config push`: o `config.toml` tem valores de desenvolvimento (confirmação de e-mail desligada, site
  127.0.0.1). Mudanças de Auth no hospedado vão pela Management API, campo a campo.

- Reanimated 4.7 na web não registra animações de entrada personalizadas (`Keyframe`, `withInitialValues`):
  o item fica com `visibility: hidden` para sempre. Use `riseIn` de `@/shared/ui` (predefinida na web).
- QR do MFA no Supabase: `data:img/svg+xml;utf-8,<?xml…?><!-- SVGo --><svg width height>` sem viewBox;
  `svgFromDataUrl` trata. Contas de Auth: criar no painel **do projeto GLIFE** (o usuário tem vários projetos).
- PowerSync web: o Metro não reescreve `new URL('./worker.js', import.meta.url)`; por isso o worker vem de
  `public/@powersync` (`pnpm --filter app powersync:assets`, roda no postinstall). `op-sqlite` fixo em ~18.2
  (o `@powersync/react-native` 2.4 aceita 17.1–18.x).
- PowerSync: o painel usa Sync Streams (não mais `bucket_definitions`). Mudou o YAML? Republique no painel
  (Validate → Deploy). Editor Monaco: cole pela área de transferência; digitar quebra a indentação.
- **Repositório público:** nada de ref do Supabase, URL do PowerSync, e-mail, IDs de usuário ou senhas em arquivos
  versionados. Isso vai em `INFRA.local.md` ou `.env*.local` (ignorados). Commits usam o e-mail noreply do GitHub.
- Toast (`useToast`): a ação é um `Text` com `onPress` — o `Pressable` não recebia o toque no web ali. Em
  testes pelo navegador, o toast some em 4 s: dispare o "Desfazer" logo (ou pela página).
- Telas de notas usam `goBack()` (cai em /notas se a tela foi aberta direto pelo endereço).
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
