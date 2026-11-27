# Status: 2026-11-27
- Tarefa atual: 0.9.0 — lembretes com vários horários no dia e notas vinculadas nas descrições — PR #3 (base fase-4-biblia)
- Branch: lembretes-horarios-e-notas-vinculadas (PR #2 fase-4-biblia → master ainda aberto)
- Feito: lembrete "Uma vez / Horários / Intervalo" (done_slots por horário, aviso e Feito/Adiar por horário); "Vincular nota"/"Nova nota" em lembrete, evento, refeição, refeição do plano, lançamento e investimento (links manuais `about`); "Mencionada em" mostra esses itens; APK 0.9.0 em Desktop\Glauber\apk
- Falta: usuário instalar o APK e rodar `pnpm sb db push --remote` logo em seguida (2 migrações); conferir na tela; juntar PR #2 e #3
- Atenção (riscos/decisões): nada conferido na tela (MFA); linhas antigas sem `time_mode` são lidas como 'once'; lançamento com "Repetir" não mostra notas vinculadas (regra não se desfaz)
- Último commit: 43f68fd
