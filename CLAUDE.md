# Glife — organizador de vida pessoal

App único (Expo SDK 58 + Expo Router + TypeScript) para Android, web e futuramente iOS.
Local-first: tudo é lido/gravado no SQLite do aparelho e sincronizado com o Supabase via PowerSync.
Módulos: notas, finanças, investimentos, compras, agenda, dieta, Bíblia/devocionais, galeria, caixa de entrada com IA.
O coração é o **grafo de links**: toda entidade tem UUID e endereço `glife://<tipo>/<ref>`; qualquer uma aponta para qualquer outra.
Planejamento: `../Glife — Planejamento do Projeto.md` · Design: `../Glife — Design System.html` · Plano por fases: `docs/PLANO_DE_IMPLEMENTACAO.md`.

## Estrutura

- `apps/app/src/app/` — rotas do Expo Router, **finas**: `export { XScreen as default } from '@/features/x'`.
- `apps/app/src/features/<feature>/` — `screens/ components/ hooks/ data/ __tests__/ index.ts`.
- `apps/app/src/shared/` — `ui/` (design system), `lib/`, `hooks/`, `navigation/`.
- `packages/domain/src/<feature>/` — regras em TS puro (Zod), usadas pelo app, testes e Edge Functions.
- `supabase/migrations/` — SQL versionado; `supabase/powersync/sync-rules.yaml`; `supabase/functions/`.

## Regras de importação (checadas por ESLint / testes)

1. Cada feature é dona do que é dela: mexer em finanças = `features/finance` + `domain/finance`.
2. Uma feature só usa outra pelo `index.ts` dela; rotas também.
3. Features não se conhecem diretamente: ligações passam pela feature `links` (registro `glife://tipo`). Só `today` compõe várias features.
4. `shared/` nunca importa features.
5. `packages/domain` não importa React, React Native, Expo, Supabase nem PowerSync.
6. Import proibido quebra o lint (`pnpm lint`).

Em `packages/domain`, imports relativos usam extensão `.ts` explícita (compatível com Deno).

## Regras de dados

- **Dinheiro sempre em centavos** (inteiro), nunca float.
- **Toda tabela** tem `id uuid`, `user_id`, `created_at`, `updated_at`, `deleted_at` e RLS — use `select public.vida_apply_standard('public.<tabela>')` e adicione à publicação `powersync` e ao `sync-rules.yaml`.
- `vida_apply_standard` também cria a política **restritiva de MFA** (só sessão `aal2` lê/grava) e `unique (id, user_id)`.
- **FK entre tabelas do usuário é sempre composta**: `foreign key (x_id, user_id) references public.x (id, user_id)`,
  com `on delete set null (x_id)` quando for opcional. FK simples deixaria apontar para linha de outro usuário.
- Funções SQL: `set search_path = ''` e nomes qualificados; função de migração leva `revoke execute ... from public, anon, authenticated`.
- Telas não conhecem o banco: dados passam por uma interface de repositório (domain) implementada em `features/<f>/data`.
- Exclusão é lógica (`deleted_at`), com lixeira.
- **Texto da Bíblia é somente leitura**; marcações, anotações e edições ficam em camadas separadas.
- Arquivos nunca passam pelo sync — só metadados.
- Segredos (service_role, IA, R2) só nos secrets das Edge Functions. O app conhece apenas `EXPO_PUBLIC_*`.

## Interface

Sofisticada e minimalista: só tokens de `shared/ui/theme/tokens.ts` (lint barra hex soltos),
uma cor de destaque, sem sombras/gradientes, separação por espaço e hairlines, modo escuro de primeira classe.
**Movimento como linguagem, com sobriedade:** toda mudança de estado anima (toque que afunda, item que se risca e
recolhe, card que expande até o detalhe, números que contam, folhas/abas que deslizam, listas que se reorganizam).
Molas amortecidas de 200–350 ms, sem quique nem enfeite; nada bloqueia o toque; respeitar “reduzir movimento”.
Implementação com React Native Reanimated (layout + entrada/saída) e haptics leve nas ações importantes (item 0.13).
Estilos via `makeStyles((t) => ({...}))`; textos via `<Text variant tone>`; ícones Lucide via `<Icon>`.
Telas usam os componentes de `@/shared/ui` (`Screen`, `Section`, `Text`, `Button`, `Input`, `ListItem`, `Sheet`, `Chip`, `EmptyState`).
Conferir toda tela nos dois temas (Ajustes → Aparência) e no Android e web.

## Comandos (na raiz `glife/`)

```bash
pnpm install          # dependências do monorepo
pnpm web              # app no navegador
pnpm android          # app no Android (dev build)
pnpm test             # vitest: domain, fronteiras do ESLint (app) e RLS/MFA do banco (supabase, via PGlite)
pnpm typecheck        # tsc em todos os pacotes
pnpm lint             # ESLint + fronteiras de features
cd apps/app && npx expo install <pkg>   # SEMPRE para libs do Expo/RN (versões compatíveis com o SDK)
cd apps/app && npx expo run:android --variant release   # APK local
```

Expo muda a cada SDK: antes de usar uma API do Expo/RN, consulte https://docs.expo.dev/versions/v58.0.0/ (não confie na memória).

## Handoff automático (Claude ⇄ Codex)

O trabalho é dividido com o Codex CLI através do `HANDOFF.md` (plano vivo) e do `AGENTS.md` (regras do Codex).

- **Pedido com mais de uma etapa:** primeiro escreva o plano no `HANDOFF.md`, em tarefas de 15–30 min, cada uma
  com arquivos permitidos, critério de aceite verificável e cuidados. Escreva os testes antes de implementar
  quando possível. Não peça aprovação do plano, exceto para decisão de arquitetura importante.
  (Continua valendo: antes de **tela nova**, liste os protótipos necessários e pergunte se o usuário quer enviá-los.)
- **Ao concluir cada tarefa:** rode `pnpm lint`, `pnpm typecheck` e `pnpm test`; marque `[x]`; atualize
  "Estado atual" com edições pontuais; commit `claude: <descrição>`.
- Tarefas com **autenticação, permissões, pagamentos ou dados sensíveis** levam "(só Claude)" no título.
- Quando uma funcionalidade terminar, mova as tarefas concluídas para `HANDOFF-arquivo.md`.
- Hooks (`.claude/settings.json` + `.claude/hooks/`): no início da sessão, se houver commits `codex:` depois do
  último `claude:`, você recebe a instrução de revisá-los primeiro; ao parar com alterações não commitadas, o hook
  pede para atualizar o `HANDOFF.md`, testar e commitar.
- Os hooks valem quando o Claude Code é aberto na pasta `glife/` (raiz do repositório).
