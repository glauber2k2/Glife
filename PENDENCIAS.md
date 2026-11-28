# Pendências do usuário

O que só o dono do projeto pode fazer (contas, chaves, testes no aparelho, decisões). Ao concluir um item, apague-o.

## Glife IA etapa 6.1: agente com DeepSeek Flash (28/11/2026) — branch `fase-6-ia`, PR #5

Já feito: 3 migrações aplicadas no GLIFE, função `ai-agent` publicada (`--import-map`), secret `DEEPSEEK_API_KEY`
conferido, teto US$ 2,00/mês. A conversa real com o modelo **não** foi testada.

- [ ] Juntar os PRs em ordem: #2 → #3 → #4 → #5 (o #5 tem base `lembretes-feitos-e-calendario`). Se outra branch
  mexeu em `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx` ou na tela inicial de Finanças, conferir conflitos.
- [ ] Gerar APK novo **a partir do código com o PR #5** (biblioteca nova: `ai`, `@ai-sdk/react`; usa `expo/fetch`).
- [ ] Testar no Chrome (`pnpm web`, não no navegador do Claude) e no APK a aba **IA** com as 44 frases de
  `docs/ia/frases-de-teste.md`, anotando o resultado no arquivo. Conferir: resposta chega aos poucos (streaming) no
  Android; "Desfazer" funciona; lixeira pede "Confirmar?"; telefone digitado é gravado inteiro.
- [ ] Se o streaming não funcionar no Android: implementar o modo sem stream (`createAgentTransport` com `mode:
  'single'` e resposta sem stream na função), previsto no desenho.
- [ ] Conferir a aba IA e Finanças (agora aberta pelo Início, com voltar) nos dois temas e em 360 dp.
- [ ] Acompanhar o gasto no painel da DeepSeek (saldo de US$ 2).

Menores adiados da revisão (fazer quando der): regex de telefone pega intervalos como `2025-2026` (o modelo vê
`[tel1]`, o app grava certo); não há ferramenta para listar pastas; se o registro da ação falhar depois de gravar, a
IA pode repetir; `event_update` só com `start_date` não guarda o `end_date` ajustado para desfazer; comentário da
busca universal fora do lugar em `src/app/_layout.tsx`; sem teste do hook `useAgentChat`.

Próximas etapas (plano em `docs/PLANO_DE_IMPLEMENTACAO.md`, Fase 6): 6.2 finanças/investimentos/compras, 6.3 dieta
e Bíblia, 6.4 caixa de entrada, Conversas, Ações da IA e Ajustes (teto editável em US$).

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
