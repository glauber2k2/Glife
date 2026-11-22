# HANDOFF — arquivo

Tarefas concluídas de funcionalidades já terminadas, movidas do `HANDOFF.md` (mais recentes no topo).

## 2026-11-22 — R3: retomada e preservação (neste commit)

- [x] Histórico até `5d7e5e3` e árvore local conferidos: `git fsck --full` sem erros, sem arquivos pendentes,
  apagados ou stash. O pedido de continuação às 16:09 foi interrompido antes de qualquer alteração em arquivo.
- [x] Backup do histórico completo (`git bundle`, verificado) e dos dois documentos externos, com manifesto
  SHA-256 em `../backups/glife-20261122-antes-retomada/`.
- [x] Orientação do usuário recuperada e registrada: implementar telas básicas previstas nas tarefas e deixar
  a prototipagem pendente. Decisões anteriores e tarefas reservadas ao Claude preservadas.
- [x] Lint, typecheck e os 123 testes passaram novamente. T9 definida a partir da dúvida de navegação de 0.13.

## 2026-11-22 — Glife, movimento e validação do domain

| Tarefa | Commit | Entrega |
|---|---|---|
| T1 | `6615c82` | Tokens de mola/escala, resolução pura e preferência dinâmica de movimento |
| R1 | `cec4cda` | Glife: pasta, Expo, identificadores, pacotes, links, docs/hooks e tema preservado |
| T2 | `9a5cdeb` | Button e Chip com mola snappy |
| T3 | `41af7c2` | Sheet com mola standard, fade do scrim e fechamento sem bloquear toque |
| T4 | `f68c2d4` | ListItem animado e demo Adicionar/Remover em Ajustes |
| T5 | `455a22c` | Lint: SDKs de banco só na camada de dados |
| T6 | `4b159cb` | Edge Function hello com import map e domain real |

Validação: lint e typecheck verdes; 123 testes (55 domain, 39 app, 29 Supabase),
build web e verificações no Edge headless. Botões/chips, folhas e lista exercitados com movimento
normal/reduzido; temas claro/escuro, lista vazia e fechamento durante entrada conferidos.
Molas/limites, fronteira de dados e handler tiveram testes novos vistos falhando antes da implementação.

Deno 2.9.8: `deno check --config supabase/functions/deno.json supabase/functions/hello/index.ts`
e execução real do handler nos casos válido/inválido/ausente. Vitest adapta o alias do import map para
o módulo real, sem dependências novas. Não houve deploy nem validação Android.

Limite: o roadmap 0.13 completo ainda exige navegação/abas e Android (detalhes no handoff ativo).
Migrações SQL commitadas e função legada `vida_apply_standard` foram preservadas.

### Tarefas e critérios originais

- [x] **R1 — Renomear o sistema/app para Glife (pedido do usuário)**
  - Arquivos: configuração Expo/pnpm/Supabase local, imports/exports do domain, esquema de URI e testes,
    preferência de tema, documentação e hooks; pasta raiz renomeada de `vida/` para `glife/`.
  - Aceite: nome Glife, slug/esquema `glife`, identificadores `app.glife.pessoal`, pacotes `@glife/*`, links
    `glife://`; preferência de tema existente preservada; lint/typecheck/test/build:web passam na nova pasta.
  - Cuidados: manter migrações SQL já commitadas e a função legada `vida_apply_standard` (sem alterar permissões).

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
- [x] **T2 — Botão e Chip que afundam ao toque (0.13b)**
  - Arquivos: `apps/app/src/shared/ui/Button.tsx`, `apps/app/src/shared/ui/Chip.tsx`.
  - Aceite: ao pressionar, escala vai a `t.size`/token `pressScale` com mola `snappy` e volta; com reduzir
    movimento, só a opacidade muda (comportamento atual); `onPress`, `disabled` e acessibilidade inalterados;
    lint/typecheck/test/build:web passam.
  - Cuidados: use `Animated.createAnimatedComponent(Pressable)` ou `Animated.View` interno; nenhum número solto.
- [x] **T3 — Sheet que desliza (0.13c)**
  - Arquivos: `apps/app/src/shared/ui/Sheet.tsx`.
  - Aceite: folha entra de baixo (mola `standard`) e o fundo (scrim) faz fade; ao fechar, sai ao contrário;
    reduzir movimento = aparece sem animação; lint/typecheck/test/build:web passam.
  - Cuidados: não bloquear toque durante a animação; manter `accessibilityViewIsModal`/fechamento atuais.
- [x] **T4 — Lista que se reorganiza + demo em Ajustes (0.13d)**
  - Arquivos: `apps/app/src/shared/ui/ListItem.tsx`, `apps/app/src/features/settings/screens/SettingsScreen.tsx`.
  - Aceite: `ListItem` aceita entrar/sair com animação de layout (Reanimated `LinearTransition` + fade);
    na seção "Design system" de Ajustes, uma lista de exemplo com botões "Adicionar" e "Remover" mostra itens
    entrando, saindo e o resto se reorganizando; reduzir movimento = sem animação; lint/typecheck/test/build:web.
  - Cuidados: é só uma demo dentro da tela existente (não criar tela nova). Textos em pt-BR.
- [x] **T5 — Lint: banco só na camada de dados**
  - Arquivos: `apps/app/eslint.config.js`, `apps/app/tests/boundaries.test.ts`.
  - Aceite: import de `@powersync/*` ou `@supabase/*` é erro fora de `src/features/*/data/**` e `src/shared/lib/**`;
    novos casos em `boundaries.test.ts` (barra em `features/notes/screens/x.ts`, permite em
    `features/notes/data/x.ts` e `shared/lib/x.ts`), vistos falhando antes da regra; `pnpm test` e `pnpm lint` passam.
  - Cuidados: os pacotes ainda não estão instalados; use `no-restricted-imports` com `patterns` (não depende de
    resolver o módulo). Não mexa nas políticas de `boundaries/dependencies` existentes.
- [x] **T6 — Edge Function "hello" usando o domain (0.9)**
  - Arquivos: `supabase/functions/hello/index.ts`, `supabase/functions/hello/handler.ts`,
    `supabase/functions/deno.json`, `supabase/tests/hello.test.ts`.
  - Aceite: `handler(req: Request): Promise<Response>` lê `?ref=Jo 3:16`, usa `parseBibleRef`/`toOsis` do domain
    e responde `{ "osis": "JHN.3.16" }` (400 com mensagem para ref inválida/ausente); `index.ts` só faz
    `Deno.serve(handler)`; `deno.json` mapeia o domain por caminho relativo; teste vitest chama `handler` com
    `new Request(...)` cobrindo válido, inválido e ausente; `pnpm test` passa.
  - Cuidados: o domain já usa imports com `.ts` (compatível com Deno). Nada de segredos. Se `deno` estiver
    instalado, rode também `deno check supabase/functions/hello/index.ts`; se não, registre em Dúvidas.

### R2 — Documentos e fechamento do handoff (neste commit)

- [x] Planejamento e design exportado na pasta pai renomeados para `Glife — Planejamento do Projeto.md` e
  `Glife — Design System.html`; título do HTML e URIs do planejamento alinhados. São documentos externos ao Git.
- [x] Referências do CLAUDE/roadmap atualizadas; 0.9 concluído, 0.13 parcial e validação Android pendente.
- [x] Entregas finalizadas arquivadas com os hashes acima; handoff ativo com estado exato e pendências.
- [x] Verificação final: lint/typecheck/123 testes passaram. Decisões de arquitetura e migrações SQL preservadas.

## Fase 0 — fundação (antes do handoff automático)

- [x] Monorepo pnpm, app Expo SDK 58, design system por tokens, navegação com 4 abas + caixa de entrada.
- [x] Domain: `glife://`, parser de `[[wikilinks]]`, diff de links, referências bíblicas pt-BR → OSIS.
- [x] ESLint de fronteiras (regras 1–4 e 6) com testes; hex solto proibido.
- [x] Migrações core/links/notes: RLS forçado, MFA aal2, FKs compostas, `search_path` fixo; testes com PGlite.
- [x] Revisão independente da Fase 0 e correção de todos os itens (críticos, importantes e menores).
- [x] Tema persistido (interface `ThemePreferenceStore`), tokens `layout/opacity/size`, ícones por aba.
