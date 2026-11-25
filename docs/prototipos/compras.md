# Compras (Fase 2) — prototipadas

Protótipo no Claude Design: `Glife Compras.dc.html` (telas em `ComprasTela.dc.html`), implementado em 25/11/2026
dentro de `features/finance` (Compras fica em Finanças e o "Comprei" grava o gasto na mesma transação).

- Modelo: `packages/domain/src/finance/shopping.ts` e `shoppingRepository.ts`; tabelas `shopping_lists` e
  `shopping_items` (migração `20261125000001_finance_compras.sql`, sync-streams atualizado).
- Telas: `/financas/compras` (listas) e `/financas/compra/[id]` (itens, rodapé e folha "Comprei"); entrada pela linha
  "Compras" em Finanças → Planejamento.

## Diferenças em relação ao protótipo

- Quantidade e preço são editados numa folha ("Editar item"), não em linha: regra do AGENTS.md (campos `Input`,
  dinheiro em linha própria, teclado nunca cobre o campo). Tocar no item abre a folha.
- Menu do item: toque longo (sem o deslizar para a esquerda nem o botão direito do web).
- A lista ganhou a folha "Lista" (⋯): renomear, trocar a categoria do gasto e excluir (com desfazer).
- Categoria na folha "Comprei" em chips (como no Novo lançamento), com a linha do orçamento do mês em que o gasto
  conta (no cartão, o mês da fatura). Data com o `DateRow` de Finanças.
- Cartão: o subtítulo mostra os dias de fechamento e vencimento (o protótipo mostrava o disponível do limite).
- Lista nova recebe a categoria de gasto com o mesmo nome, quando existe ("Mercado" → Mercado).
