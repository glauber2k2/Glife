---
name: ferramenta-ia
description: Ensinar o Glife IA (agente com DeepSeek Flash) a fazer algo novo — nova ferramenta de busca, criação, alteração ou lixeira em um módulo.
---

# Ferramenta de IA

Desenho: `docs/superpowers/specs/2026-11-27-glife-ia-agente-design.md`. O agente roda **no aparelho**: a Edge
Function `ai-agent` só repassa as definições ao modelo; quem executa é o app, com os repositórios da feature.

1. **Definição** em `packages/domain/src/<feature>/ai-tools.ts` com `defineAiTool`: nome `snake_case`, descrição curta
   em pt-BR, entrada Zod e **risco**: `read` (lê), `write` (grava direto com "Desfazer") ou `confirm` (pede
   "Confirmar?"). Marque `money: true` em tudo que mexe com dinheiro e `bulk: true` em mudanças de vários itens —
   os dois sempre pedem confirmação. Ids entram como **apelidos** (`n1`, `e1`), nunca UUID. Reuse os limites e
   regras do modelo da feature (nada de regra duplicada). Inclua no `AI_TOOLS` (`domain/ai/registry.ts`).
2. **Excluir é sempre lixeira** (`remove`/`restore`). Nunca crie ferramenta que apague de vez ou esvazie a lixeira.
3. **Executor** no kit da feature (`apps/app/src/features/<feature>/ai/<feature>AiKit.ts`), exportado por
   `use<Feature>AiTools()` no `index.ts` e somado em `AiComposition` (`src/app/_layout.tsx`):
   - ids: `resolveAlias(ctx.aliases, tipo, apelido)` para entrar; `ctx.aliases.alias(tipo, id)` para sair;
   - texto que vai ao modelo: `ctx.aliases.mask(...)`; texto que vem para gravar: `ctx.aliases.unmask(...)`;
   - saída mínima: só os campos necessários, listas com limite, totais em vez de linhas cruas; dinheiro com `formatBRL`;
   - devolva `touches` (estado anterior só dos campos mudados) e um `summary` curto para o cartão;
   - ferramenta `confirm` ganha uma frase em `preview` (o que vai acontecer, com o título do item).
4. **Desfazer** em `undo[tipo]` do kit: criar → lixeira; alterar → aplica o `before`; lixeira → `restore`. Idempotente.
5. **Testes**: entrada válida/inválida e risco no domínio; executor, saída sem UUID e desfazer em `apps/app/tests/aiKits.test.ts`
   (repositórios em memória). O teste de cobertura garante que toda definição tem executor.
6. **Frases de teste**: ao menos 3 por ferramenta em `docs/ia/frases-de-teste.md` (frase → ferramentas → confirma?).
