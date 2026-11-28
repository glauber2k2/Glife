# Pendências do usuário

O que só o dono do projeto pode fazer (contas, chaves, testes no aparelho, decisões). Ao concluir um item, apague-o.

## Investimentos v2 (28/11/2026) — branch `investimentos-v2`

- [ ] Publicar (migração autorizada em 27/11): `pnpm sb db push --remote` (`20261203000001_investimentos_v2`),
  publicar a função `quotes` e **republicar o `sync-streams.yaml`** no painel do PowerSync (Validate → Deploy).
- [ ] Conferir no Chrome e no APK (claro/escuro, 360 dp, nomes longos): painel (gráfico com arraste e períodos,
  rosca Atual/Meta, "Definir metas" somando 100, ranking Minha carteira e Mercado, leitura da carteira), detalhe do
  ativo (Resumo com preço médio, Estatísticas tocando nos números, IA salvando nota, Notas) e o "Novo ativo" com a
  busca ("logis", "itau", "btc", "BOVA11" digitado).
- [ ] Ver se o histórico de 3 meses da brapi chega com a sua chave (gráfico de ITSA4 com ~60 pontos). Se vier vazio,
  as estatísticas da B3 dependem só do histórico que o app acumula a partir de agora.
- [ ] Juntar a branch depois da `fase-6-ia` (ou antes, conferindo conflitos em `_layout.tsx` e `PENDENCIAS.md`).

Menores adiados da revisão: "abaixo da meta" com meta igual/0%; sugestão diz "hoje" com preço de até 24 h; histórico
do app sem prazo diário; gravação do histórico sequencial; sombra na lista de sugestões; números soltos (swatch,
faixa ±2, limiar 3 p.p.); preço médio calculado em 4 lugares; chaves React duplicáveis em InsightBlocks; vínculo que
falha não tenta de novo; área do gráfico com último valor nulo; marcas de busca sem limite; "Mais negociadas" mistura
papéis e reais; cripto com data de Brasília e UTC.

## Versão 0.9.0: lembretes com vários horários e notas vinculadas (27/11/2026)

- [ ] Conferir no Android e no Chrome (claro/escuro, 360 dp): lembrete com "Horários" (08:00, 14:00 e 20:00) e com
  "Intervalo" (a cada 2 h das 08:00 às 18:00): cada horário aparece na agenda e no Início, tem aviso próprio, e
  "Feito" e "Adiar" no aviso valem só para aquele horário.
- [ ] Conferir as notas vinculadas em lembrete, evento, refeição, refeição do plano, gasto e investimento:
  "Vincular nota" e "Nova nota", tocar para abrir, o X desfaz. Na nota, "Mencionada em" mostra o item.

## Notas sem tipo (27/11/2026)

- [ ] Conferir: notas que eram devocional ou diário ganharam as tags `devocional` e `diário`; o editor não tem mais o seletor de tipo e a lista de notas só tem os filtros Todas e Fixadas (mais as tags).

## Bíblia v2: planos de leitura (27/11/2026)

- [ ] Gerar APK novo e conferir no Chrome e no Android (claro/escuro, 360 dp): leitor em Outfit, Aa (tamanho, entrelinhas, letras), grifo e sublinhado com respiro, seleção em sobretom, busca ("aguas", "Jo 3:16"), início com AT/NT e últimos registros, criar plano, ler pelo plano e marcar como lido, pausar/retomar, lembrete às 06:30.

## Bíblia (26/11/2026)

- [ ] Gerar APK novo (bibliotecas nativas novas: expo-file-system, expo-document-picker; `prebuild --clean`).
- [ ] Conferir no Chrome e no APK (claro/escuro, 360 dp): Início → Bíblia, abrir um capítulo, grifar nas 4 cores e sublinhar, remover, Anotar (vira nota com [[Jo 3:16]]), ver o marcador no versículo, abrir o versículo pela nota, trocar BLIVRE/BPM, importar uma tradução (USFM) e remover.
- [ ] Saber: traduções importadas ficam só no aparelho e somem ao sair da conta (importar de novo depois).

## Fechamento da Fase R2 (26/11/2026)

- [ ] Instalar o APK 0.5.0 e conferir no Android e no Chrome: dois temas, largura de 360 dp e textos longos.
- [ ] Testar uma alteração offline entre Android e web, a preferência do olhinho após reabrir e os botões Feito, Registrar e Adiar com o app aberto e com o app fechado (incluindo concluir um item adiado).

## Agenda e dieta (26/11/2026)

- [ ] Instalar o APK novo (tem biblioteca nativa nova, a de notificações) e permitir as notificações quando o app pedir.
- [ ] Testar: evento com aviso 15 min antes, lembrete avulso, refeição do plano com aviso, tudo com o celular offline.

## Investimentos (25/11/2026)

- [ ] Opcional: gerar chaves novas na brapi e na CoinGecko (as atuais foram coladas num chat) e regravar com
      `pnpm sb secrets set --env-file supabase/functions/.env.secrets.local --yes` (arquivo local, ignorado pelo git).
- [ ] Testar Investimentos no Chrome e no APK: claro/escuro, 360 dp, nomes longos, ação (ITSA4), FII (HGLG11),
      cripto (bitcoin), "Já tenho", aporte com conta (saldo e extrato), encerrar, excluir e desfazer.

## Compras (25/11/2026)

- [ ] Testar Compras no Chrome e no APK (claro/escuro, 360 dp).
- [ ] Confirmar: "pago por outra pessoa" deve contar como **receita**?

## Já publicado (não precisa fazer)

Migrações até `20261127000002` (R2 publicada em 26/11/2026 após backup em `../backups/glife-r2-20261126/`); verificação de RLS hospedado sem problemas. A Edge Function `quotes` e os Sync Streams v7 já estavam publicados; Sync Streams v8 (com `diet_goals`) publicados em 26/11/2026; v10 (com `bible_plans` e `bible_plan_reads`) publicados em 27/11/2026. Migrações `20261130000001` (notas sem tipo) e
`20261201000001` (lembretes com vários horários) aplicadas em 27/11/2026; `rls_check.sql` = 0 linhas. Secrets `BRAPI_TOKEN` e `COINGECKO_DEMO_KEY` gravados em 27/11/2026.
