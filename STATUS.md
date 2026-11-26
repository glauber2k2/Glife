# Status: 2026-11-26
- Tarefa atual: fechamento da Fase R2; código concluído e APK 0.5.0 gerado
- Branch: fase-r2
- Feito: R2 (finanças, tags/seleção, calendário, dieta, notificações/Adiar, sincronização e vínculos); lint, TypeScript e 1.119 testes verdes; build web e APK verificados; backup restaurado; migrações 20261127000001/2 publicadas e RLS hospedado sem problemas; APK/ZIP em `../Glife-0.5.0.*`, assinatura igual à 0.4.0
- Falta: usuário republicar `supabase/powersync/sync-streams.yaml` no PowerSync (Validate → Deploy) e conferir Chrome/Android, dois temas e 360 dp; instalar APK e testar offline/avisos
- Atenção (riscos/decisões): `diet_goals` só sincroniza após publicar os streams; login preservado (sem saída automática nem apagar fila); preferências de notificações por módulo ficam para evolução posterior; sem celular conectado para conferir a interface
- Último commit: 25973e2
