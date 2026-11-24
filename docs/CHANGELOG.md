# Changelog

## 0.2.1 — 2026-11-24

- Finanças: tocar num lançamento (Início, fatura, extrato) mostra os detalhes e "Excluir lançamento", com "Desfazer";
  numa compra parcelada, dá para excluir só a parcela ou a compra inteira.
- Finanças: "Excluir conta" (no extrato) e "Excluir cartão" (na fatura) levam junto os lançamentos e as recorrências;
  conta que paga a fatura de um cartão pede para excluir o cartão antes.
- Notas: toque longo numa nota da lista abre "Abrir" e "Mover para a lixeira".
- Notas: menu ⋯ da pasta com "Renomear pasta" e "Excluir pasta" (manter as notas ou mandá-las para a lixeira).
- Notas: na Lixeira, apagar uma nota de vez (além de esvaziar tudo).

## 0.2.0 — 2026-11-24

- Finanças (Fase 2), seguindo o protótipo "Glife Finanças":
  - Início: saldo hoje, esperado no fim do mês, a confirmar (confirmar, corrigir valor, pular, com "Desfazer"),
    próximos, cartões com a fatura atual, orçamento do mês, contas, últimos lançamentos e seletor de mês.
  - Novo lançamento: gasto, receita ou transferência; teclado em centavos; parcelamento no cartão; previsto e repetir.
  - Cartão e fatura: aberta, fechada, parcial, paga e vencida; previstos do cartão; pagar fatura (total ou parcial).
  - Nova conta ou cartão, com "Este cartão já está em uso?" (fatura em aberto e parcelamentos em andamento).
  - Recorrentes e editor de regra ("Aplicar a partir de quando?", "Encerrar recorrência").
  - Orçamentos por categoria, editáveis na linha; extrato da conta com saldo por dia, busca e filtro.
  - Categorias padrão criadas no primeiro uso, com id fixo (não duplicam entre aparelhos).

## 0.1.0 — 2026-11-23

- Primeira versão: acesso com MFA, notas, busca universal, bloqueio do app e Ajustes.
