# Changelog

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
