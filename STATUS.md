# Status: 2026-11-28
- Tarefa atual: Fase 6.1 — Glife IA (agente com DeepSeek Flash, Vercel AI SDK `ai@7.0.131`): fundação + notas e agenda
- Branch: fase-6-ia (saiu de lembretes-feitos-e-calendario; PRs #2–#4 ainda abertos em cadeia)
- Feito: domínio `ai`, migrações `20261202000001` (uso/teto) e `…0002` (teto atômico: reserva + acerto), Edge Function `ai-agent`, executor + registro local com Desfazer seguro, kits de notas/agenda, aba IA; revisão final feita e corrigida (UUID mascarado, teto atômico, uso em abort, pedido fantasma, limite de rodadas, lote, desfazer); 1.440 testes verdes
- Falta: usuário criar chave DeepSeek e pôr DEEPSEEK_API_KEY e GLIFE_AI_USD_BRL nos secrets; `pnpm sb db push --remote`; `pnpm sb functions deploy ai-agent`; rodar `docs/ia/frases-de-teste.md` no Chrome e no APK
- Atenção (riscos/decisões): streaming no Android não testado (fallback sem stream não existe); dados vão à DeepSeek (China) minimizados e mascarados; menores adiados: regex de telefone em intervalos de anos, listar pastas, comentário fora do lugar no _layout
- Último commit: ver `git log -1` (status pós-revisão)
