# Status: 2026-11-25
- Tarefa atual: Compras (Fase 2), implementada pelo protótipo `Glife Compras` (docs/prototipos/compras.md)
- Branch: master
- Feito: modelo (listas, itens, "Comprei" que grava o gasto e limpa a lista juntos, com desfazer), migração 20261125000001, sync-streams, telas /financas/compras e /financas/compra/[id], linha "Compras" em Finanças → Planejamento; lint, tipos e testes verdes
- Falta: **usuário:** `pnpm sb db push --remote`, republicar o sync-streams.yaml no painel e testar no web (Chrome) e no APK (claro/escuro, 360 dp). Depois: Investimentos, gráficos e Hoje (Fase 2)
- Atenção (riscos/decisões): telas de Compras não foram vistas rodando (login com MFA; o navegador do app Claude não abre o banco local); edição de qtd./preço em folha, não em linha; sem deslizar para abrir o menu; "pago por outra pessoa" conta como receita (confirmar); build Android em C:\gl
- Último commit: cc5a882
