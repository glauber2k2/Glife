# Pendências do usuário

O que só o dono do projeto pode fazer (contas, chaves, testes no aparelho, decisões). Ao concluir um item, apague-o.

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

- [ ] Criar conta grátis na brapi (https://brapi.dev) e gerar o token.
- [ ] Criar conta grátis na CoinGecko e gerar a chave **Demo**.
- [ ] Guardar as chaves no Supabase (projeto GLIFE), na raiz `glife/`:
      `pnpm sb secrets set BRAPI_TOKEN=sua_chave COINGECKO_DEMO_KEY=sua_chave`
      (sem elas, a brapi só cota PETR4, VALE3, MGLU3 e ITUB4, e a CoinGecko fica bem limitada).
- [ ] Testar Investimentos no Chrome e no APK: claro/escuro, 360 dp, nomes longos, ação (ITSA4), FII (HGLG11),
      cripto (bitcoin), "Já tenho", aporte com conta (saldo e extrato), encerrar, excluir e desfazer.

## Compras (25/11/2026)

- [ ] Testar Compras no Chrome e no APK (claro/escuro, 360 dp).
- [ ] Confirmar: "pago por outra pessoa" deve contar como **receita**?

## Já publicado (não precisa fazer)

Migrações até `20261127000002` (R2 publicada em 26/11/2026 após backup em `../backups/glife-r2-20261126/`); verificação de RLS hospedado sem problemas. A Edge Function `quotes` e os Sync Streams v7 já estavam publicados; Sync Streams v8 (com `diet_goals`) publicados em 26/11/2026; v10 (com `bible_plans` e `bible_plan_reads`) publicados em 27/11/2026. Migrações `20261130000001` (notas sem tipo) e
`20261201000001` (lembretes com vários horários) aplicadas em 27/11/2026; `rls_check.sql` = 0 linhas.
