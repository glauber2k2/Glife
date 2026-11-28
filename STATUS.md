# Status: 2026-11-27
- Tarefa atual: Fase 6.1 — Glife IA (agente com DeepSeek Flash, Vercel AI SDK `ai@7.0.131`): fundação + notas e agenda
- Branch: fase-6-ia (saiu de lembretes-feitos-e-calendario; PRs #2–#4 ainda abertos em cadeia)
- Feito: domínio `ai` (ferramentas, política, limpeza/apelidos, preço), migração `20261202000001` (uso/teto, só service_role grava), Edge Function `ai-agent`, executor + registro local de ações com Desfazer, kits de notas/agenda, aba IA (Finanças virou rota com voltar); 1.420 testes verdes
- Falta: usuário criar chave DeepSeek e pôr os secrets DEEPSEEK_API_KEY e GLIFE_AI_USD_BRL no Supabase; `pnpm sb db push --remote`; `pnpm sb functions deploy ai-agent`; rodar `docs/ia/frases-de-teste.md` no Chrome e no APK; revisão final do branch
- Atenção (riscos/decisões): streaming no Android não testado (fallback sem stream não implementado); dados vão à DeepSeek (China) já minimizados e mascarados; spec `docs/superpowers/specs/2026-11-27-glife-ia-agente-design.md`, plano `docs/superpowers/plans/2026-11-27-glife-ia-etapa1-fundacao.md`
- Último commit: ver `git log -1` (docs da etapa 1)
