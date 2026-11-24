# Finanças (Fase 2) — prototipadas

Protótipo no Claude Design: `Glife Financas.dc.html` (telas em `Financas App.dc.html`), implementado em 24/11/2026
(`features/finance`, versão 0.2.0). O que ficou de fora está em "Atenção" no STATUS.md.

## Histórico: pedido de prototipagem

O modelo de dados está pronto (spec `docs/superpowers/specs/2026-11-24-financas-modelo-design.md`): contas, cartão
com fatura (fechamento e vencimento), parcelas, cartão já em uso, recorrências com confirmação, orçamento pelo mês em
que é pago e previsão. A aba Finanças hoje é só um placeholder (`features/finance/screens/FinanceHomeScreen.tsx`).
Cole o prompt no Claude Design (projeto do Glife, com o design system `Glife Design System` anexado) e traga o
resultado. Se ficar grande demais para uma rodada, peça primeiro as telas 1–4 e depois as 5–8.

## Prompt para o Claude Design

```
Projete o módulo "Finanças" do Glife (app pessoal de organização de vida, pt-BR, Android e web, um único usuário).
O objetivo não é só registrar gastos: é PLANEJAR. O app mostra o que já aconteceu (realizado) e o que vai acontecer
(previsto: salário todo dia 10, aluguel, assinaturas, boleto agendado, fatura do cartão) e calcula o saldo esperado.
Use o design system anexo (Glife — direção Glaciar + Sinóptico) e siga-o à risca: Hanken Grotesk na interface
(títulos grandes e leves), neutros azulados com um único destaque azul-aço, sem sombras nem gradientes, sem caixas
para agrupar (blocos separados por 18 px + linha de 1 px), controles em pílula, campos com raio 16, margem lateral 22,
ícones Lucide contorno 1,5, sem emoji. Valores em reais com números tabulares ("R$ 1.234,56"; saída com "−", entrada
com "+"). Gráficos monocromáticos em cinza, com o destaque só no dado que importa (mês atual, categoria que estourou).
Claro e escuro de cada tela. Mobile 390×844 com a barra de abas (Hoje · Notas · Finanças · Bíblia + botão central
discreto da caixa de entrada); no web, coluna de no máximo 720 px com navegação no topo.

Regras do domínio que a interface precisa deixar claras:
- Cartão de crédito age como cartão: tem dia de fechamento e de vencimento. Compra até o fechamento cai na fatura do
  mês; no dia do fechamento ou depois, na seguinte. A fatura é chamada pelo mês do vencimento ("Fatura de dezembro ·
  vence 10/12"). Situações: aberta, fechada, paga, parcial, vencida.
- Compra parcelada vira uma parcela por fatura ("Geladeira · 4/10").
- Orçamento por categoria conta a compra no cartão no mês em que a fatura é PAGA (não no mês da compra).
- Pagar a fatura é uma transferência da conta corrente para o cartão; não é gasto (não entra no orçamento).
- Previsto espera confirmação: no dia, aparece para confirmar com um toque, podendo corrigir o valor ("veio
  R$ 5.200"); se o dia passa, fica "atrasado". Há também "pular este mês". O saldo real só muda com o confirmado.
- Recorrente editado vale "deste mês em diante" (os meses passados não mudam).

Telas:
1. Início de Finanças (aba). Topo: saldo hoje (soma das contas) e, logo abaixo, "esperado em 31/12" com o saldo
   projetado; seletor de mês em pílulas (‹ dezembro ›) para olhar meses futuros. Blocos: (a) A confirmar — previstos
   de hoje e atrasados, cada um com "Confirmar" e menu (corrigir valor, pular, editar); (b) Próximos — previstos até o
   fim do mês (data, descrição, valor, ícone de recorrente); (c) Cartões — cada cartão com a fatura atual (valor,
   vence em, situação) e "Pagar"; (d) Orçamento do mês — categorias com gasto × orçamento em barra monocromática,
   destaque só se estourar, e o previsto em tom mais claro na mesma barra; (e) Contas — nome e saldo; (f) Últimos
   lançamentos. Ação principal: "Novo lançamento".
2. Novo lançamento (folha/sheet). Tipo em controle segmentado: Gasto · Receita · Transferência. Valor grande com
   teclado numérico (centavos), descrição, categoria (chips com ícone), conta/cartão, data. Se a conta for cartão:
   "Parcelar" (1× a 12×+, mostrando o valor da parcela e a fatura onde cai a primeira: "1ª parcela na fatura de
   janeiro"). Opções: "É previsto" (agendado) e "Repetir" (semanal, mensal, anual, a cada N; termina nunca / em data).
3. Confirmar previsto (folha curta): "Salário · previsto para hoje · R$ 5.000,00" com o valor editável, data
   editável, "Confirmar" e "Pular este mês".
4. Detalhe do cartão / fatura: seletor de fatura por mês (‹ dez ›), cabeçalho com total, pago, restante, fechamento
   e vencimento e a situação; lista de compras e estornos da fatura (parcelas com "4/10"), previstos do cartão
   (assinaturas) em tom de previsto; ação "Pagar fatura" (folha com valor sugerido = restante, conta pagadora, data;
   aceita pagamento parcial). Mostre os estados aberta, fechada, parcial, paga e vencida.
5. Nova conta / novo cartão. Tipo: Conta corrente · Poupança · Carteira · Cartão de crédito. Conta: nome e saldo
   inicial. Cartão: nome, dia de fechamento, dia de vencimento, limite (opcional), conta que paga a fatura. Depois,
   para cartão, a pergunta "Este cartão já está em uso?" com duas escolhas: "Trazer o que já existe" (valor da fatura
   em aberto + lista de parcelamentos em andamento: descrição, valor da parcela, "parcela 4 de 10", com "Adicionar
   outro") ou "Começar do zero".
6. Recorrentes: lista das regras ativas (descrição, valor, frequência, próxima data, conta) e o editor de uma regra.
   Ao salvar uma mudança, a pergunta "Aplicar a partir de quando?" com a data (deste mês em diante); "Encerrar
   recorrência".
7. Orçamentos: lista de categorias de despesa com o valor mensal (editável em linha) e o histórico do mês
   (gasto realizado, previsto e restante); estado de categoria sem orçamento.
8. Extrato de uma conta: saldo real e projetado no topo; lançamentos agrupados por dia, com realizados e previstos
   (previsto em tom mais claro, atrasado marcado), busca e filtro por categoria.

Estados a mostrar: primeiro uso (nenhuma conta: uma frase e "Adicionar conta", sem ilustração); mês com dados
completos; mês futuro só com previstos; item atrasado; orçamento estourado; fatura vencida.

Movimento (sóbrio, molas tap/std/emph/gentle, respeitando "reduzir movimento"): números do saldo contam até o valor
ao mudar de mês; confirmar um previsto o faz passar de tom claro para cheio e sair de "A confirmar" recolhendo;
pular risca e recolhe; barras do orçamento crescem da esquerda; trocar de mês desliza o conteúdo na direção da seta;
folhas sobem com mola emph; tocar num cartão expande até o detalhe da fatura. Descreva cada animação junto da tela.
```
