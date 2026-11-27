# Status: 2026-11-27
- Tarefa atual: 0.9.1 — lembrete feito fica riscado e desmarcável; calendário sem ponto da dieta — PR #4 (base lembretes-horarios-e-notas-vinculadas)
- Branch: lembretes-feitos-e-calendario (PR #2 e #3 ainda abertos, em cadeia)
- Feito: `done` em agendaBetween, `uncompleteReminder`, `lateReminders` (atrasado feito hoje fica riscado); TaskRow marca/desmarca; dieta não marca mais o calendário (DayMarks removido); APK 0.9.1 em Desktop\Glauber\apk
- Falta: usuário instalar o APK e conferir na tela; se ainda não rodou, `pnpm sb db push --remote` (migrações da 0.9.0); juntar PR #2, #3 e #4
- Atenção (riscos/decisões): nada conferido na tela (MFA); no lembrete repetido de um horário, `skipped_dates` = datas feitas (só o "feito" grava ali)
- Último commit: 7d7e7d1
