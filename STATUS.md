# Status: 2026-11-24
- Tarefa atual: Fase 2 — telas de Finanças implementadas a partir do protótipo "Glife Finanças" (8 telas + folhas); APK 0.2.0
- Branch: master
- Feito: domain `finance/overview.ts` (visão do mês, fatura, extrato, próxima ocorrência) e categorias padrão com id fixo; app: FinanceProvider, Início, Novo lançamento, Confirmar, Pagar fatura, Cartão/fatura, Nova conta/cartão (em uso), Extrato, Recorrentes/regra, Orçamentos; versão 0.2.0 + docs/CHANGELOG.md
- Falta: **usuário:** `pnpm sb db push --remote` (migração de finanças) e republicar `sync-streams.yaml` no PowerSync; conferir as telas no Android e no web (dois temas) com a conta real; validar T19, T20, T26
- Atenção (riscos/decisões): sem a migração no Supabase, lançamentos ficam só no aparelho (fila de envio falha); fora do protótipo nesta versão: animação "cartão que vira tela" (usa a transição de detalhe), "Escolher data" ao aplicar regra, confirmar previsto agendado no cartão; datas digitadas (dd/mm/aaaa) em vez de calendário; menores antigos da revisão de finanças seguem pendentes
- Último commit: ceca272
