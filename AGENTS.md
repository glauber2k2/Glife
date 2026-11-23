# AGENTS.md — instruções para o Codex

Projeto **Glife**: organizador de vida pessoal (Expo SDK 58 + Expo Router + TypeScript, local-first com
SQLite/PowerSync/Supabase). Arquitetura completa e regras em `CLAUDE.md`; plano por fases em
`docs/PLANO_DE_IMPLEMENTACAO.md`. Você trabalha em dupla com o Claude Code, que planeja e revisa.

## Como trabalhar

1. **Leia o `HANDOFF.md` inteiro antes de tudo.** Depois leia o `CLAUDE.md`.
2. Execute as tarefas `[ ]` **em ordem**, respeitando para cada uma: arquivos permitidos, critério de aceite e
   cuidados. **Pule** as tarefas marcadas **"(só Claude)"** e as listadas como bloqueadas.
3. Não altere a seção "Decisões tomadas", não refatore o que já está `[x]` e não adicione dependências que a
   tarefa não peça.
4. Depois de **cada** tarefa, na raiz `glife/`:
   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   ```
   (e `pnpm build:web` quando a tarefa mexer no app). Só marque `[x]` se tudo passar. Atualize "Estado atual"
   do `HANDOFF.md` com uma linha. Faça commit **`codex: <descrição>`** (uma tarefa por commit).
5. Ambiguidade ou bloqueio: **não improvise.** Registre em "Dúvidas para o Claude" (tarefa, o que está ambíguo,
   opções que você vê) e siga para a próxima tarefa **independente**.
6. Quando não houver mais tarefas possíveis, **pare** e resuma: tarefas feitas (com hash dos commits), dúvidas
   registradas e o que ficou pendente.

## Segurança

- Nunca coloque segredos no código, em testes ou em commits. O app só conhece variáveis `EXPO_PUBLIC_*`;
  `service_role`, chaves de IA e do R2 ficam nos secrets das Edge Functions.
- Valide toda entrada externa (requisições, armazenamento local, parâmetros) — trate o que vier como não confiável.
- Não exponha dados pessoais (logs, mensagens de erro, URLs).
- Banco: toda tabela nova via `select public.vida_apply_standard('public.<t>')`; FK entre tabelas do usuário
  sempre composta `(x_id, user_id) references public.x (id, user_id)`; funções com `set search_path = ''`.
  Nunca edite uma migração já commitada: crie outra. Mudanças de banco que afetem permissões são "(só Claude)".

## Padrões de código

- **Estrutura:** rotas finas em `apps/app/src/app/` (`export { XScreen as default } from '@/features/x'`);
  cada feature em `apps/app/src/features/<f>/` (`screens/ components/ hooks/ data/ index.ts`);
  `shared/` (ui, lib, navigation) nunca importa features; regras de negócio em `packages/domain` (TS puro, sem
  React/Expo/Supabase/PowerSync, imports relativos com extensão `.ts`).
- **Fronteiras:** uma feature só usa outra pelo `index.ts`; só `today` compõe outras features; ligações entre
  entidades passam pela feature `links`. O ESLint barra o resto.
- **SOLID:** responsabilidade única por módulo; dependa de interfaces (ex.: `ThemePreferenceStore`,
  repositórios), com a implementação concreta injetada na raiz (`src/app/_layout.tsx`).
- **Interface:** design system Glife em `docs/design-system/` (Hanken Grotesk, Crimson Pro só para ler, azul-aço, pílulas).
  Só componentes de `@/shared/ui` (`Screen`, `Section`, `Text`, `Button`, `IconButton`, `Input`, `ListItem`,
  `Sheet`, `Chip`, `EmptyState`, `Icon`, `Spinner`, `Reveal`); estilos com `makeStyles((t) => ({ … }))` usando apenas tokens
  (`t.space`, `t.colors`, `t.size`, `t.layout`, `t.opacity`…). **Nada de hex ou número solto** — crie um token.
  Modo claro e escuro sempre. Textos da interface em **português do Brasil**.
- **Movimento:** Reanimated, molas amortecidas 200–350 ms, sem quique; respeite "reduzir movimento".
- **Dados:** dinheiro em centavos (inteiro); exclusão lógica (`deleted_at`); texto da Bíblia somente leitura.
- **Testes:** vitest. Escreva o teste antes da implementação e confirme que ele falha antes. Banco: testes em
  `supabase/tests` (Postgres real via PGlite). Lint: `apps/app/tests/boundaries.test.ts`.
- **Libs do Expo/RN:** `cd apps/app && npx expo install <pkg>`; confira a API em
  https://docs.expo.dev/versions/v58.0.0/.
- **Telas novas:** não crie tela nova que não esteja descrita numa tarefa do `HANDOFF.md`.
  Orientação do usuário em 22/11/2026: implemente a versão básica das telas autorizadas e registre a
  prototipagem como pendente; não aguarde protótipo para avançar.
