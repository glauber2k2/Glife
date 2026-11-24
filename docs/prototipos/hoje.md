# Hoje (Fase 1) — prototipagem pedida

Hoje a tela tem só blocos vazios (`apps/app/src/features/today`). Na Fase 1 ela ganha notas fixadas e recentes; os
outros blocos se preenchem conforme os módulos chegam (agenda e dieta na Fase 3, finanças na 2, devocional na 4,
caixa de entrada com IA na 6). Cole o prompt no Claude Design (projeto do Glife, com o design system
`Glife Design System` anexado) e traga o resultado.

## Prompt para o Claude Design

```
Projete a tela "Hoje" do Glife (app pessoal de organização de vida, pt-BR, Android e web, um único usuário).
É a primeira aba e a tela que abre o app: um resumo calmo do dia, para olhar em 5 segundos e seguir.
Use o design system anexo (Glife — direção Glaciar + Sinóptico) e siga-o à risca: Hanken Grotesk na interface
(títulos grandes e leves), Crimson Pro só para leitura (versículo/devocional), neutros azulados com um único
destaque azul-aço, sem sombras nem gradientes, sem caixas para agrupar (blocos separados por 18 px + linha de 1 px),
controles em pílula, campos com raio 16, margem lateral 22, ícones Lucide contorno 1,5, sem emoji.
Claro e escuro de cada estado. Mobile 390×844 com a barra de abas (Hoje · Notas · Finanças · Bíblia + botão central
discreto da caixa de entrada); no web, coluna única de no máximo 720 px com navegação no topo.

Cabeçalho: data por extenso pequena acima ("domingo, 23 de novembro"), título "Hoje", à direita lupa (abre a busca
universal, Ctrl+K no web) e ajustes.

Blocos, em uma coluna, nesta ordem (cada um com rótulo pequeno em caixa alta e uma ação curta quando fizer sentido):
1. Próximo compromisso — hora, título, local; "e mais 2 hoje".
2. Próxima refeição — horário e o que está no plano.
3. Gastos do mês — valor gasto contra o orçamento, barra monocromática com o destaque só se passar do limite;
   valores em reais com números tabulares.
4. Devocional do dia — referência e um trecho em Crimson Pro; estado "feito hoje".
5. Caixa de entrada — itens pendentes (texto curto, origem, há quanto tempo), ação "Anotar algo".
6. Notas — fixadas primeiro, depois as recentes (título, prévia de uma linha, data relativa); "Ver todas".

Mostre: (a) o dia cheio, com todos os blocos preenchidos; (b) o estado da Fase 1, em que só Notas e Caixa de
entrada têm dados e os outros blocos estão vazios — vazios discretos, uma linha cada, sem ilustração, sem parecer
quebrado (considere esconder ou recolher blocos de módulos ainda não configurados e diga qual prefere);
(c) primeiro uso, sem nenhum dado.

Movimento (sóbrio, molas tap/std/emph/gentle, respeitando "reduzir movimento"): blocos entram em cascata de 40 ms
ao abrir; números do gasto contam até o valor; tocar numa nota faz o card expandir até a tela da nota; item da
caixa de entrada concluído se risca e recolhe. Descreva cada animação junto da tela.
```
