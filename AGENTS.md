# AGENTS.md — regras do projeto Glife (fonte única para Claude e Codex)

Organizador de vida pessoal: app único (Expo SDK 58 + Expo Router + TypeScript) para Android, web e futuramente iOS.
Local-first: tudo é lido/gravado no SQLite do aparelho e sincronizado com o Supabase via PowerSync.
Módulos: notas, finanças, investimentos, compras, agenda, dieta, Bíblia/devocionais, galeria, caixa de entrada com IA.
O coração é o **grafo de links**: toda entidade tem UUID e endereço `glife://<tipo>/<ref>`; qualquer uma aponta para qualquer outra.
Planejamento: `../Glife — Planejamento do Projeto.md` · Design: `docs/design-system/` · Fases: `docs/PLANO_DE_IMPLEMENTACAO.md`
· Protótipos (Claude Design): `docs/prototipos/` · Histórico antigo: `docs/arquivo/`.

## Fluxo de trabalho entre IAs ("modo reserva")

O Claude é o agente principal; o Codex só assume quando os créditos do Claude acabam. Os dois seguem as mesmas regras.

- **Retomada:** leia apenas `AGENTS.md`, `STATUS.md`, `HANDOFF.md` (se existir) e `git log --oneline -15`.
  Não explore o projeto inteiro: leia só os arquivos necessários à tarefa. Ao retomar depois da outra IA, confira
  os commits feitos desde o "Último commit" registrado no `STATUS.md` (`git log <hash>..HEAD`, revise o diff).
- **Durante o trabalho:** não escreva nem atualize handoff a cada passo. Faça commits pequenos e descritivos no
  formato `tipo(área): descrição` (ex.: `feat(notas): …`, `fix(auth): …`, `docs(fluxo): …`; tipos feat, fix,
  refactor, test, docs, chore, style). Antes de cada commit: `pnpm lint && pnpm typecheck && pnpm test`.
- **STATUS.md:** atualize SOMENTE ao concluir uma etapa ou ao encerrar a sessão. Ele é SUBSTITUÍDO a cada vez
  (sem histórico), no máximo 10 linhas, neste formato:
  ```
  # Status: AAAA-MM-DD
  - Tarefa atual:
  - Branch:
  - Feito:
  - Falta:
  - Atenção (riscos/decisões):
  - Último commit:
  ```
- **Handoff sob demanda:** só quando o usuário escrever "preparar handoff", gere `HANDOFF.md` uma única vez, no
  máximo 40 linhas, em tópicos: objetivo, estado atual, próximos passos em ordem, arquivos-chave, decisões tomadas,
  como testar e pendências. Use o contexto da sessão, o `STATUS.md` e o `git log`; não releia o projeto inteiro.
- **Segurança é do Claude:** autenticação, permissões, pagamentos, dados sensíveis e migrações que afetem permissões
  só com pedido explícito do usuário. Ambiguidade: não improvise; registre em "Atenção" do `STATUS.md` e pare.
- **Telas novas:** antes de criar, pergunte ao usuário se ele quer enviar protótipo. Telas já previstas no plano podem
  avançar na versão básica, com a prototipagem registrada como pendente (orientação de 22/11/2026).

## Estrutura

- `apps/app/src/app/` — rotas do Expo Router, **finas**: `export { XScreen as default } from '@/features/x'`.
- `apps/app/src/features/<feature>/` — `screens/ components/ hooks/ data/ __tests__/ index.ts`.
- `apps/app/src/shared/` — `ui/` (design system), `lib/`, `hooks/`, `navigation/`.
- `packages/domain/src/<feature>/` — regras em TS puro (Zod), usadas pelo app, testes e Edge Functions.
- `supabase/migrations/` — SQL versionado; `supabase/powersync/sync-streams.yaml`; `supabase/functions/`.
- Dependências concretas (ex.: `ThemePreferenceStore`, repositórios) são injetadas na raiz `src/app/_layout.tsx`.

## Regras de importação (ESLint e testes barram o resto)

1. Cada feature é dona do que é dela: mexer em finanças = `features/finance` + `domain/finance`.
2. Uma feature só usa outra pelo `index.ts` dela; rotas também.
3. Features não se conhecem diretamente: ligações passam pela feature `links` (registro `glife://tipo`). Só `today` compõe várias features.
4. `shared/` nunca importa features.
5. `packages/domain` não importa React, React Native, Expo, Supabase nem PowerSync; imports relativos com extensão `.ts` (Deno).
6. `@glife/domain/testing` só em testes.

## Dados e banco

- **Dinheiro sempre em centavos** (inteiro). Exclusão lógica (`deleted_at`) com lixeira. **Texto da Bíblia é somente leitura**
  (marcações e anotações em camadas separadas). Arquivos nunca passam pelo sync — só metadados.
- Toda tabela: `id uuid`, `user_id`, `created_at`, `updated_at`, `deleted_at` e RLS via
  `select public.vida_apply_standard('public.<tabela>')` (cria RLS forçado, políticas de dono, política **restritiva
  de MFA aal2** e `unique (id, user_id)`); adicione à publicação `powersync` e ao `sync-streams.yaml`
  (filtro `auth.user_id()` + `aal2`; o PowerSync lê com BYPASSRLS).
- **FK entre tabelas do usuário é sempre composta**: `foreign key (x_id, user_id) references public.x (id, user_id)`,
  com `on delete set null (x_id)` quando opcional.
- Funções SQL: `set search_path = ''`, nomes qualificados; função de migração leva `revoke execute ... from public, anon, authenticated`.
- Migração já commitada **nunca** é editada: crie outra. Telas não conhecem o banco: dados via interface de repositório
  (domain) implementada em `features/<f>/data`.

## Segurança

- Segredos (service_role, IA, R2) só nos secrets das Edge Functions; o app conhece apenas `EXPO_PUBLIC_*`.
- **Repositório público:** nada de ref do Supabase, URL do PowerSync, e-mail, IDs de usuário ou senhas em arquivos
  versionados (vão em `INFRA.local.md` ou `.env*.local`, ignorados). Commits com o e-mail noreply do GitHub, sem co-autoria.
- Valide toda entrada externa; não exponha dados pessoais em logs, mensagens de erro ou URLs.

## Interface e movimento

- Direção **Glaciar** (cor/forma) + **Sinóptico** (tipo): neutros azulados, um destaque azul-aço, Hanken Grotesk na
  interface (títulos grandes e leves), Crimson Pro só para leitura, controles em pílula, campos raio 16, margem lateral 22.
- Só tokens de `shared/ui/theme/tokens.ts` (`t.space`, `t.colors`, `t.size`, `t.layout`, `t.opacity`…): **nada de hex
  ou número solto** — crie um token. Sem NativeWind, sombras ou gradientes; **sem caixas para agrupar**: blocos separados
  por 18 px + linha de 1 px. Modo escuro de primeira classe. Sem emoji; Lucide só contorno 1,5. Textos em português do Brasil.
- Estilos via `makeStyles((t) => ({...}))`; textos via `<Text variant tone>`; ícones via `<Icon>`. Componentes de
  `@/shared/ui`: `Screen`, `Section`, `Text`, `Button`, `IconButton`, `Input`, `ListItem`, `Sheet`, `Chip`, `Spinner`,
  `Reveal`, `EmptyState`, `Switch`, `SegmentedControl`, `BackHeader`.
- **Movimento como linguagem, com sobriedade** (Reanimated): toda mudança de estado anima; molas `tap` 200, `standard` 300,
  `emphasis` 350, `gentle` 320 ms; toque afunda 0,96; listas em cascata de 40 ms (`Reveal`); sem quique; nada bloqueia o
  toque; respeite "reduzir movimento"; haptics leve nas ações importantes.
- Conferir toda tela nos dois temas (Ajustes → Aparência) e no Android e web.

## Decisões tomadas (não mudar sem motivo)

- Monorepo pnpm: `apps/app`, `packages/domain`, `supabase/`. Testes vitest em todos os pacotes; banco em Postgres real via PGlite.
- Bloqueio do app: o app **não** se esconde na lista de recentes e prints ficam liberados (usuário, 24/11/2026).
  Pendência futura opcional: esconder o conteúdo nos recentes (protótipo "Glife Bloqueio", seção 05).
- Hashes de commit citados antes de 23/11/2026 em `docs/arquivo/` são do histórico antigo (reescrito antes da publicação).

## Armadilhas conhecidas

- Expo muda a cada SDK: consulte https://docs.expo.dev/versions/v58.0.0/ e instale libs com `cd apps/app && npx expo install <pkg>`.
- Reanimated 4.7 na web não registra entradas personalizadas (`Keyframe`, `withInitialValues`): o item fica invisível.
  Use `riseIn` de `@/shared/ui` (esmaece na web, sobe no Android).
- CLI do Supabase: `pnpm sb … --remote` (sem `--remote`, `db push` mira o Docker local). **Não** rode `pnpm sb config push`
  (o `config.toml` é de desenvolvimento); Auth do hospedado muda pela Management API, campo a campo. Contas de Auth: criar
  no projeto **GLIFE** (o usuário tem vários).
- QR do MFA do Supabase vem como data URL SVG sem viewBox: `svgFromDataUrl` trata.
- PowerSync web: o worker vem de `public/@powersync` (`pnpm --filter app powersync:assets`, roda no postinstall).
  `op-sqlite` fixo em ~18.2. No navegador embutido do app Claude o banco local não abre ("Client has already been
  closed": lá o shared worker não cria worker aninhado); teste o web no Chrome. Mudou o `sync-streams.yaml`? Republique no painel (Validate → Deploy; cole, não digite).
- Toast: a ação é um `Text` com `onPress` (o `Pressable` não recebia o toque no web); some em 4 s nos testes pelo navegador.
- Telas de notas usam `goBack()`. Servidor estático simples dá 404 ao recarregar rotas: navegue a partir de `/`.
- Screenshots logo após trocar de aba pegam a transição: espere ~1 s.
- Testes de banco aplicam todas as migrações num PGlite novo: SQL incompatível quebra `pnpm test`.
- Windows: comandos na raiz `glife/`; avisos "LF will be replaced by CRLF" são inofensivos.

## Comandos (na raiz `glife/`)

```bash
pnpm install          # dependências
pnpm web              # app no navegador
pnpm android          # app no Android (dev build)
pnpm lint             # ESLint + fronteiras + hex solto
pnpm typecheck        # tsc em todos os pacotes
pnpm test             # vitest: domain, app e banco (PGlite)
pnpm build:web        # export web (apps/app/dist)
pnpm sb <comando>     # CLI do Supabase com credenciais só deste projeto (.env.supabase.local)
pnpm codex            # abre o Codex já no fluxo de retomada
cd apps/app && npx expo run:android --variant release   # APK local (receita do Windows na skill release-android)
deno check --config supabase/functions/deno.json supabase/functions/hello/index.ts
```
