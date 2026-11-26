# Status: 2026-11-26
- Tarefa atual: Fase R (redesign Cobalto) implementada em todo o app; falta conferir no aparelho
- Branch: master
- Feito: R.0–R.9 — tokens/fontes Cobalto (Outfit, DM Mono, Literata), componentes novos em `shared/ui`, barra de abas flutuante e topo no web, e todas as telas (acesso, bloqueio, Início, busca, captura, notas, finanças, compras, investimentos, agenda, dieta, Ajustes, Bíblia provisória); fontes do Glaciar removidas
- Falta: **usuário:** abrir o app logado no web (Chrome) e no Android, conferir os dois temas e 360 dp, e gerar APK novo (fontes novas = `prebuild --clean`). Depois: Fase R2
- Atenção (riscos/decisões): a 5ª aba é Finanças até a IA existir (Fase 6); "+" e "Anote ou lembre…" abrem a captura (ainda sem gravar); Dieta mostra refeições feitas no lugar de calorias (R2); só a tela Entrar foi conferida no navegador (as demais pedem login e o banco não abre no navegador embutido)
- Último commit: d1a5fb9
