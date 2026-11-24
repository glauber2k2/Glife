# Busca universal (Fase 1) — prototipagem pendente

Versão básica implementada na T19 (23/11/2026) em `apps/app/src/features/search`, sem protótipo (orientação do
usuário de 22/11: construir o básico e deixar a prototipagem pendente).

## O que existe

- Tela `busca` (modal): título "Buscar", fechar (X / Esc no web), campo com foco automático.
- Campo vazio: todas as ações e "Recentes" (fixadas primeiro, depois as mais recentes).
- Digitando: grupos Ações → Notas → Pastas → Tags, cada linha com ícone; nota mostra o trecho do corpo com o termo
  em destaque. Enter abre o primeiro resultado. "Nova nota: <texto>" sempre aparece.
- Abre por Ctrl+K / ⌘K (web), lupa em Hoje e lupa em Notas.

## Prompt para o Claude Design

```
Projete a busca universal do Glife (app pessoal de organização de vida, pt-BR, Android e web, um único usuário).
Use o design system anexo (Glife — direção Glaciar + Sinóptico) e siga-o à risca: Hanken Grotesk na interface,
um destaque azul-aço, sem sombras/gradientes, sem caixas para agrupar (blocos separados por 18 px + linha de 1 px),
controles em pílula, campos com raio 16, margem lateral 22, molas tap/std/emph/gentle. Claro e escuro.
Mobile 390×844; no web, paleta sobreposta (estilo Ctrl+K) com no máximo 720 px.

Estados: (1) campo vazio com ações rápidas e notas recentes/fixadas; (2) digitando, resultados agrupados em Ações,
Notas (título + trecho com o termo destacado), Pastas e Tags; (3) nada encontrado, com "Nova nota: <texto>";
(4) navegação por teclado no web (setas, Enter, Esc) com a linha ativa marcada; (5) como a busca abre a partir
da lupa em Hoje/Notas e como o resultado escolhido vira a tela de destino (movimento).
```
