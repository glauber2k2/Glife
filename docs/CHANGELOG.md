# Changelog

## 0.9.1 — 2026-11-27

- Agenda: lembrete marcado como feito não some mais. Ele fica na lista com o círculo cheio e o texto riscado; outro
  toque desmarca (para quando marcou sem querer). Vale na Agenda, no "Para hoje" do Início e no calendário do mês
  ("· Feito"). Atrasado marcado hoje fica riscado na lista de hoje até o dia acabar.
- Calendário: dia livre fica sem ponto. As refeições do plano da dieta não marcam mais o dia (o ponto verde aparecia
  em todos os dias); os pontos mostram só eventos e lembretes.

## 0.9.0 — 2026-11-27

- Agenda: lembrete mais de uma vez no dia. Em "Quantas vezes no dia", escolha **Horários** (uma lista, ex.: 08:00,
  14:00 e 20:00) ou **Intervalo** (de tanto em tanto tempo, a partir de uma hora até outra, ex.: a cada 2 h das 08:00
  às 18:00). Cada horário aparece na agenda, no Início e na central, tem o próprio aviso e se conclui sozinho
  ("Feito" e "Adiar" no aviso valem só para aquele horário).
- Notas vinculadas: nos campos de descrição de lembrete, evento, refeição, refeição do plano, lançamento e investimento,
  "Vincular nota" liga uma nota que já existe e "Nova nota" cria uma nota já ligada. Toque na nota para abri-la; o X
  desfaz o vínculo. Na nota, "Mencionada em" mostra o item que a vinculou.

## 0.8.2 — 2026-11-27

- Notas: o filtro não mostra mais chips de tag; para achar, busque `#nome` no campo de busca (acha as notas com a tag e as que têm o texto).
- Bíblia: sublinhado mais firme (2,75) e desenhado por linha no Android; nota excluída some na hora do leitor e dos registros.
- Movimento: abas deslizam do lado da aba escolhida; telas entram empurrando da direita com paralaxe e o voltar faz o caminho
  inverso; capítulo anterior entra pela esquerda; telas que não tinham transição própria agora têm.

## 0.8.1 — 2026-11-27

- Correção: o app fechava sozinho no Android sempre que mostrava uma caixinha de marcar (lembrete no Início, lista de compras, plano de leitura, seleção de notas). Um teste agora barra esse tipo de erro nas animações.
- Notas: nota é só nota — sem os tipos Devocional e Diário (viram tags). A migração `20261130000001` só deve ser aplicada depois de instalar esta versão.

## 0.8.0 — 2026-11-27

- Bíblia: texto todo em Outfit (a mesma fonte do app), um versículo por linha, cabeçalho leve e barras que somem ao rolar.
- Bíblia: ajustes de leitura em "Aa" (tamanho, espaço entre linhas e entre letras, números dos versículos); grifos com respiro entre as linhas; seleção em sobretom, sem borda; barra de seleção em três linhas.
- Bíblia: novo início com busca no texto (sem acento, sem internet, reconhece referências), Antigo/Novo Testamento, continuar lendo e últimos registros (anotações, grifos, sublinhados) com filtro.
- Bíblia: planos de leitura — vários ao mesmo tempo, criar a partir de modelos ou personalizado, ler pelo plano e marcar como lido, dias perdidos e recuperar, pausar/retomar e lembrete diário.
- Banco: tabelas dos planos de leitura (migrações aplicadas no GLIFE); Sync Streams com as tabelas novas (republicar no painel).

## 0.7.0 — 2026-11-27

- Bíblia: leitor offline com a Bíblia Livre e a Bíblia Portuguesa Mundial; troca de tradução; livros, "Ir para" e continuar de onde parou.
- Bíblia: toque nos versículos para grifar em 4 cores ou sublinhar; "Anotar" cria uma nota comum já ligada ao versículo, e o versículo mostra as notas que o citam (a nota também abre o versículo).
- Bíblia: importar uma tradução própria (USFM ou JSON), guardada só no aparelho.
- Início: atalho da Bíblia em "Seus espaços".
- Notas: editor no Android sem entrelinha fixa (texto não treme com linhas vazias); erro que fecha o app aparece num aviso na abertura seguinte.
- Sincronização: Sync Streams v9 publicados (marcações da Bíblia).

## 0.6.1 — 2026-11-26

- Notas: duas linhas em branco depois de uma lista não criam mais espaço no topo nem fecham o app ao tocar; o cursor não atrasa ao formatar; subir de pasta volta em vez de empilhar a mesma tela; mover pasta para dentro dela mesma explica o motivo.
- Finanças: campo de data volta a dizer Hoje, Ontem ou Amanhã; total menor que o número de parcelas não deixa salvar e explica o mínimo.
- Sincronização: Sync Streams v8 publicados (metas da dieta sincronizam).

## 0.6.0 — 2026-11-26

- Início: olhinho no resumo financeiro, com a mesma preferência de visibilidade salva no Financeiro.
- Finanças: em compras parceladas, escolha entre informar o total da compra e o valor de cada parcela; a simulação mostra o total e preserva os centavos.
- Notas: criar e navegar por subpastas, mover pastas sem formar ciclos e escolher destinos pelo caminho completo; contagens agregadas sem carregar corpos das notas.
- Editor: corrigidos índices inválidos de seleção e formatação da primeira linha vazia; estrutura de texto ao vivo estabilizada para espaços e quebras, preservando o Markdown. O crash relatado ainda precisa de confirmação em aparelho Android.
- Agenda, dieta e finanças: tocar em data/hora abre o seletor nativo da plataforma; campos opcionais permitem limpar o valor.

## 0.5.1 — 2026-11-26

- Avisos: "Feito" e "Adiar" funcionam também com o app fechado.
- Finanças: restaurar um lançamento é recusado (com o motivo) quando a conta foi excluída ou quando é uma parcela isolada.
- Mensagens de erro mostram o motivo real sem expor erro técnico; desfazer ajuste de saldo que falha avisa.
- Item não encontrado com textos neutros; vínculos para itens sem tela não ficam mudos; abertura sem piscar no primeiro acesso.
- Notas: nome do arquivo .md exportado usa a data local.

## 0.5.0 — 2026-11-26

- Finanças: gerenciar e ordenar categorias, contas e cartões, arquivar e ajustar saldo sem afetar o orçamento; olhinho com preferência salva para ocultar valores.
- Notas: gerenciar tags, juntar sem duplicar vínculos e selecionar várias notas para mover, aplicar tags, fixar, exportar ou excluir, com desfazer.
- Agenda: calendário mensal com indicadores de eventos, lembretes e refeições.
- Dieta: calorias, macros, metas diárias e histórico por semana ou mês; meta calórica zero equivale a não acompanhar.
- Sistema: central de notificações e ações nos avisos; folha Adiar com 10 minutos, 1 hora, amanhã às 9h ou horário escolhido.
- Sincronização: fila de alterações e contagens locais, primeira sincronização sem piscar offline e mensagens distintas para falha, sessão recusada e tempo esgotado; sucesso só após uma troca concluída.
- Vínculos: restaurar item na lixeira, tentar sincronizar item ausente e informar quando um item existe sem tela disponível.
- Marca: ícone Cobalto no Android e no navegador e nova imagem de abertura.

## 0.4.0 — 2026-11-26

- Redesign Cobalto em todo o app: fonte Outfit, fundo cinza com cartões brancos, cobalto só nas ações, cor própria em cada módulo e mascote nos estados vazios; tema escuro refeito.
- Navegação: barra de abas flutuante (Início · Agenda · + · Notas · Finanças); no web, barra no topo com busca (Ctrl+K) e folhas como janela central.
- Início: saudação, "Para hoje" com lembretes que se riscam, mês até agora, próxima refeição, notas fixadas em cartões e atalhos de "Seus espaços".
- Agenda virou aba: faixa da semana, lembretes com check e linha do tempo com a marca de agora.
- Notas, Finanças, Compras, Investimentos, Dieta, Ajustes, acesso e bloqueio refeitos no novo visual; Dieta mostra quantas refeições do plano já foram feitas.
- Movimento mais curto: toque afunda e volta com mola, listas em cascata, folhas sobem em 400 ms.

## 0.3.2 — 2026-11-25

- Notas (Android): a formatação aparece enquanto se escreve (títulos, negrito, itálico, sublinhado, tachado, marca-texto, citação e vínculos), com as marcações em cinza claro; saiu a troca Escrever/Ler. Ligações e "Mencionada em" ficam no fim da nota.

## 0.3.1 — 2026-11-25

- Toast: texto e ação alinhados; a ação ("Desfazer") responde em toda a sua pílula.
- Notas: barra de formatação com título, subtítulo, negrito, itálico, sublinhado, tachado e marca-texto (rola para o lado em telas estreitas); o modo Ler desenha cada um.

## 0.3.0 — 2026-11-25

- Compras: listas e itens; "Comprei" vira gasto com um toque (com desfazer).
- Investimentos: ativos, aportes, resgates, rendimentos e cotação; ações e FIIs (brapi) e cripto (CoinGecko) com cotação automática; aportes e resgates mexem no saldo da conta.
- Gráficos (Finanças → Planejamento → Gráficos, ou o bloco "Últimos 6 meses"): entradas e saídas, para onde foi o dinheiro, saldo das contas e patrimônio, por mês, 6 ou 12 meses; tocar ou arrastar mostra o valor; cada categoria abre o detalhe com orçamento e lançamentos.
- Hoje: bloco "Mês até agora" (gasto contra o orçamento, como o mês fecha com os previstos e a maior categoria).
- Hoje: tocar numa nota expande a linha até a tela da nota; voltar encolhe até a linha.
- Web largo: abas no topo.

## 0.2.5 — 2026-11-24

- Recorrentes: excluir uma ocorrência marca só ela como pulada (não volta como prevista); previstos da fatura e do extrato abrem ao tocar, com Confirmar, Outra pessoa pagou e Excluir.
- Saldo insuficiente: pagar fatura ou confirmar conta acima do saldo mostra aviso e pede "… mesmo assim".
- Outra pessoa pagou: fatura ou conta marcada como paga sem sair dinheiro das suas contas (entrada + pagamento; saldo igual).

## 0.2.4 — 2026-11-24

- Novo lançamento: o valor é digitado no teclado do aparelho (saiu o teclado próprio).
- Novo lançamento: campos em ordem lógica (valor, conta ou cartão, parcelas, categoria, descrição, data, previsto, repetir).
- Repetição mensal ou a cada N meses: escolha o dia da cobrança; a 1ª cobrança cai no próximo dia escolhido.
- Recorrentes: ao encerrar, a regra sai na hora da lista e da contagem de ativas.

## 0.2.3 — 2026-11-24

- Notas: na barra do editor, "Ler/Escrever" fica na mesma linha do seletor de tipo e dos botões (estava mais alto).

## 0.2.2 — 2026-11-24

- Teclado: ao tocar num campo, a tela (ou a folha) sobe e rola até ele; o teclado não cobre mais o conteúdo no Android.
- Campos: o texto não encosta mais na borda de baixo no Android e o rótulo corta com reticências em vez de vazar.
- Nova conta: os chips de tipo e de conta pagadora não mudam de largura ao marcar (a linha não quebra mais).
- Nova conta (cartão em uso): "Valor da parcela" em linha própria; se o histórico falhar, o cartão não fica pela metade
  e o aviso diz o motivo.
- Notas: no seletor "Tipo da nota", marcar uma opção não muda mais a quebra de linha da descrição.

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
