# Status: 2026-11-28
- Tarefa atual: Fase 6.1 — Glife IA (agente com DeepSeek Flash, Vercel AI SDK `ai@7.0.131`) concluída em código e publicada; falta testar no app
- Branch: fase-6-ia (PR #5, base lembretes-feitos-e-calendario; PRs #2–#4 abertos em cadeia, juntar em ordem)
- Feito: domínio `ai`, 13 ferramentas de notas/agenda, migrações `20261202000001`–`…0003` aplicadas no GLIFE (teto atômico em dólar, US$ 2,00/mês), função `ai-agent` publicada, executor + registro local com Desfazer seguro, aba IA (Finanças abre pelo Início); revisão final corrigida; 1.435 testes verdes
- Falta: juntar PRs #2→#5; APK novo com o PR #5; rodar `docs/ia/frases-de-teste.md` no Chrome e no APK — lista completa em `PENDENCIAS.md` (seção Glife IA 6.1)
- Atenção (riscos/decisões): streaming no Android não testado (fallback sem stream não existe); deploy de função precisa de `--import-map supabase/functions/deno.json`; dados vão à DeepSeek minimizados e mascarados; spec `docs/superpowers/specs/2026-11-27-glife-ia-agente-design.md`
- Último commit: c6e130d (pendências da IA)
