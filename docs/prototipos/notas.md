# Prototipagem pendente — Notas (Fase 1)

Já implementado em versão básica (`apps/app/src/features/notes`):
- **Lista** (segue `ui_kits/app/NotasScreen.jsx` do design system): busca, filtros Todas/Fixadas/Diário/Devocionais,
  linhas com título, data, prévia e tipo; botão + para nova nota; estado vazio.
- **Editor**: título e texto em markdown num campo simples, salvando sozinho; fixar; mover para a lixeira.

Falta protótipo para o que o kit não mostra. Cole o prompt no Claude Design (projeto do Glife, com o design system
`Glife Design System` anexado) e traga o resultado.

---

## Prompt para o Claude Design

```
Projete as telas de Notas do Glife (app pessoal de organização de vida, pt-BR, Android e web, um único usuário).
Use o design system anexo (Glife — direção Glaciar + Sinóptico) e siga-o à risca: Hanken Grotesk na interface,
Crimson Pro só para leitura longa, um destaque azul-aço, sem sombras/gradientes, sem caixas para agrupar (blocos
separados por 18 px + linha de 1 px), controles em pílula, campos com raio 16, margem lateral 22, molas
tap/std/emph/gentle. Claro e escuro de cada tela. Mobile 390×844; no web, coluna de no máximo 720 px.

A lista de notas e a nota aberta em modo leitura já existem no kit (NotasScreen / NoteDetail): mantenha o mesmo
idioma visual e a transição "card que vira tela" entre elas.

Preciso de:

1. EDITOR DA NOTA (escrita) — título grande leve (30/300) e corpo em markdown. Barra discreta com: voltar, tipo
   (Nota / Diário / Devocional, trocável), fixar, mais ações (mover para pasta, mover para a lixeira). Mostre:
   - alternância Escrever ⇄ Ler (pré-visualização do markdown: títulos, listas, citações, negrito, links);
   - barra de formatação mínima acima do teclado no Android (negrito, lista, citação, [[ vínculo ]]);
   - estado "salvando…/salvo" sem ruído (o app salva sozinho e funciona offline);
   - nota nova vazia (placeholder) e nota longa com rolagem.

2. VÍNCULOS — ao digitar [[ abre uma lista de sugestões (outras notas pelo título; criar "Nova nota: …" se não
   existir). No modo leitura, [[Título]] aparece como link. Ao fim da nota, seção "Vínculos" com as ligações de
   saída e "Mencionada em" (backlinks), no estilo da seção Vínculos do NoteDetail do kit.

3. PASTAS E TAGS — como escolher a pasta de uma nota, como navegar por pastas na lista (sem árvore pesada), e
   tags como chips. Estados: sem pastas ainda, pasta vazia.

4. LIXEIRA — lista das notas excluídas (data da exclusão), restaurar com um toque, toast "Nota restaurada" com
   "Desfazer". Ao mover para a lixeira a partir do editor: volta à lista e mostra toast "Nota movida para a
   lixeira · Desfazer". Onde fica o acesso à lixeira (sugestão: no fim da lista ou em Ajustes).

5. Especificação para implementação: espaçamentos, tipografia e cores referindo os tokens do design system, e a
   coreografia das transições (lista → editor, escrever ⇄ ler, item que some ao ir para a lixeira).
```
