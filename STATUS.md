# Status: 2026-11-26
- Tarefa atual: Fase 3 (agenda, lembretes, dieta) em versão básica, sem design (redesenho geral virá depois)
- Branch: master
- Feito: domínio `time` (repetição, avisos), `agenda` e `diet` com testes; RowStore genérico (domain + SQLite) reutilizável; migração 20261126000001 com RLS, FK composta e sync; telas Agenda/Evento/Lembrete/Dieta/Refeição/Registro; blocos em Hoje; avisos locais (expo-notifications, 7 dias, até 60); notas com markdown ao vivo e volta do Ler; lint, tipos, testes e build web verdes
- Falta: **usuário:** `PENDENCIAS.md` (db push da migração nova, republicar sync-streams, APK novo). **Próximo:** APK 0.4.0 com `prebuild --clean` (lib nativa nova) e teste dos avisos offline; depois Fase 4
- Atenção (riscos/decisões): repetição em campos (não RRULE); editar uma ocorrência muda a série; avisos nunca sincronizam (cada aparelho agenda); nada visto rodando com login
- Último commit: faa56a8
