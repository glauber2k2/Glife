---
name: nova-feature
description: Criar um tipo/módulo novo no Vida (ex.: metas, viagens) de ponta a ponta — banco, sync, domain, pastas da feature, links, IA e testes.
---

# Nova feature

Siga na ordem. Nome da feature em inglês no código (`goals`), rotas em português (`/metas`).

1. **Banco** — use a skill `migracao-supabase` para criar as tabelas (RLS, `deleted_at`, publicação, sync rules).
2. **Domain** — `packages/domain/src/<feature>/`:
   - `schema.ts` com Zod estendendo `baseEntitySchema` de `../core/index.ts`.
   - `rules.ts` com funções puras (criar, validar, calcular). Dinheiro em centavos.
   - `index.ts` exportando a API pública. Imports relativos com `.ts`.
   - Testes em `__tests__/` (vitest). `pnpm test` verde.
3. **Tipo de entidade** — adicione o tipo em `ENTITY_TYPES` (`domain/core`) para ganhar `vida://<tipo>/<id>`.
4. **App** — `apps/app/src/features/<feature>/` com `screens/ components/ hooks/ data/ __tests__/ index.ts`.
   - `data/`: tabela no schema local do PowerSync + queries.
   - Registre o tipo no registro da feature `links` (título, ícone, rota) para aparecer no buscador `[[` e nos backlinks.
5. **Rotas** — arquivos finos em `src/app/` que só reexportam a tela pelo `index.ts`.
6. **Telas** — use a skill `tela-modulo`.
7. **IA** — use a skill `ferramenta-ia` para as ferramentas de criar/alterar.
8. **Verificação** — `pnpm typecheck && pnpm lint && pnpm test`; abrir no web e no Android, nos dois temas.
