# Status: 2026-11-25
- Tarefa atual: Investimentos (Fase 2) com cotação automática — implementado (docs/prototipos/investimentos.md)
- Branch: master
- Feito: ativos e movimentos, "Já tenho", encerrar, desfazer; aportes/resgates no saldo e extrato; Edge Function `quotes` (brapi p/ ações e FIIs, CoinGecko p/ cripto, cache 30 min, só aal2); telas lista/detalhe/folha/cadastro; revisão final com 4 correções; lint, tipos, testes e build web verdes
- Falta: **usuário:** `pnpm sb db push --remote`; republicar o sync-streams.yaml; criar conta grátis na brapi e na CoinGecko (chave demo) e rodar `pnpm sb secrets set BRAPI_TOKEN=… COINGECKO_DEMO_KEY=… --remote`; `pnpm sb functions deploy quotes --remote`; testar Compras e Investimentos no Chrome e no APK (claro/escuro, 360 dp). Depois: gráficos e Hoje (Fase 2)
- Atenção (riscos/decisões): telas não vistas rodando (MFA; navegador do app não abre o banco local); brapi grátis atrasa ~30 min; 12 pequenos pontos da revisão adiados (ledger em .superpowers, apagado; resumo no último commit de docs); "pago por outra pessoa" conta como receita (confirmar)
- Último commit: 0cb7cea
