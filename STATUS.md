# Status: 2026-11-26
- Tarefa atual: bugs do Android: crash ao tirar refeição do plano e texto tremendo nas notas com linhas vazias
- Branch: fase-r2 (ainda não juntada ao master)
- Feito: R2 completa e usabilidade 0.6.x; editor de notas no Android sem entrelinha fixa (hipótese do tremor); erro fatal do JS guardado no aparelho e mostrado num alerta na abertura seguinte
- Falta: gerar APK novo; usuário testar tremor (2+ linhas vazias) e tirar refeição do plano; se crashar, fotografar o alerta "O Glife fechou por um erro" (sem alerta = crash nativo, pegar `adb logcat`); juntar fase-r2 ao master
- Atenção (riscos/decisões): causa do crash da dieta NÃO encontrada (domain testado sem erro; sem aparelho); tremor corrigido por hipótese, não verificado; no Android o editor fica com entrelinha natural (mais justa); sessão expirada não desloga sozinha; adiados: botões por módulo em Ajustes, .md como arquivo no Android, evento de vários dias só no 1º dia
- Último commit: 39b05a7
