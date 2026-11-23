---
name: tela-modulo
description: Criar ou refazer uma tela do Glife respeitando o design system minimalista, LinkPanel e estados offline/carregando/vazio.
---

# Tela de módulo

1. A tela vive em `features/<feature>/screens/`, exportada pelo `index.ts`; a rota em `src/app/` só reexporta.
2. Use apenas `@/shared/ui`: `Screen`, `Section`, `Text`, `Button`, `IconButton`, `Input`, `ListItem`, `Sheet`, `Chip`, `Icon`,
   `Spinner`, `Reveal`, `EmptyState`. Referência visual: `docs/design-system/` (direção Glaciar + Sinóptico).
   Estilos só com `makeStyles((t) => …)` usando tokens (`t.space`, `t.colors`, `t.radius`). Nada de hex/tamanho solto.
3. Hierarquia por tipografia (tamanho/peso), não por cor ou caixas. Uma cor de destaque só no que pede ação ou está ativo.
   Sem sombras/gradientes e **sem caixas/cards para agrupar**: blocos separados por 18 px + linha de 1 px (`Section`).
   Controles em pílula, campos com raio 16, margem lateral 22. Rótulos de bloco 11 px em caixa alta. Alvos ≥ 44 px.
4. Telas de detalhe de entidade incluem `<LinkPanel entity=…/>` (de `@/features/links`).
5. Estados: carregando, vazio (uma frase + uma ação, sem ilustração), offline (funciona igual — é local-first) e erro.
6. Ações importantes (salvar gasto etc.) com `haptic` no `Button`. Movimento com as molas `tap`/`standard`/`emphasis`/`gentle` (200–350 ms); listas entram em cascata de 40 ms (`Reveal`).
7. Verifique: tema claro e escuro (Ajustes → Aparência), web (largura grande e estreita) e Android.
   `pnpm typecheck && pnpm lint`.
