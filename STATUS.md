# Status: 2026-11-24
- Tarefa atual: Fase 2 — modelo de dados de finanças concluído (sem telas); próximo: telas de Finanças (perguntar protótipo antes)
- Branch: master
- Feito: Fases 0–1 até o bloqueio; Ajustes no protótipo; finanças: money, cartão com fatura, parcelas, cartão já em uso, recorrências (UUID v5), orçamento pelo mês pago, previsão, migração 20261124000001, sync e repositórios (spec e plano em docs/superpowers)
- Falta: **configurações externas (usuário):** `pnpm sb db push --remote` (migração de finanças no Supabase) e republicar `supabase/powersync/sync-streams.yaml` no painel do PowerSync (Validate → Deploy); validar no web com login T19, T20, T26; APK 0.11 + revisao-seguranca; pendências dos protótipos
- Atenção (riscos/decisões): sem a migração aplicada, gravações de finanças no app falham no envio ao servidor; menores adiados da revisão: check de parcela no SQL aceita campos nulos (precisa migração nova), `put` do SQLite sem filtro de user_id, consistência ao excluir conta pagadora, `@noble/hashes` fora do deno.json; trocar senha do `powersync_role`; Android não validado
- Último commit: 088daf4
