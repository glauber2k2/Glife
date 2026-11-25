# Gráficos de Finanças (Fase 2) — prototipada

Protótipo no Claude Design: `Glife Gráficos.dc.html` (telas em `GraficosTela.dc.html`), implementado em 25/11/2026.

## O que entrou

- **Gráficos** (`/financas/graficos?modo=mes|6m|12m&mes=AAAA-MM&de=Hoje`): período em pílula; no modo Mês, setas
  até o mês anterior ao primeiro lançamento. Blocos: Entradas e saídas (contorno × preenchido, previsto empilhado,
  semanas no modo Mês), Para onde foi (até 7 linhas: 6 + Outras), Saldo das contas (real até hoje, tracejado até o
  fim do mês que vem com previstos e faturas) e Patrimônio investido (valor após o último movimento até cada data).
- **Categoria** (`/financas/grafico/[categoria]`): total, comparação com o período anterior, orçamento do mês
  (barra de 3 px que não muda de cor; só o número estourado em vermelho), barras por mês e lançamentos.
- **Toque**: etiqueta só texto + linha de 1 px; as outras barras esmaecem a 35%; some 2,5 s depois de soltar.
- **Entradas**: bloco "Últimos 6 meses" em Finanças (depois de Orçamento do mês, só no mês atual), linha
  "Gráficos" em Planejamento e "Mês até agora" em Hoje (antes da Caixa de entrada; abre Gráficos no modo Mês).
- Regras dos números em `packages/domain/src/finance/charts.ts` (mesmas do orçamento: fatura no mês do pagamento,
  estorno abate, transferência e pulado ficam fora).

## Diferenças do protótipo (decididas na implementação)

- Compra no cartão com data fora do mês da fatura entra na primeira (ou última) semana no modo Mês.
- Hoje sem orçamento definido: mostra o gasto, os previstos e a maior categoria, sem barra.
- O rótulo "Categoria · período" fica abaixo do título (o `BackHeader` desenha o título).
- Troca de tela usa a transição padrão da pilha (sem o deslize próprio de 28 px).
- Não conferido rodando: MFA e o navegador do app não abrem o banco local (testar no Chrome e no Android).
