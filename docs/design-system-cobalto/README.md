# Glife Cobalto v1.0 — design system

Direção visual do app desde 26/11/2026 (Fase R do plano). Substitui a direção Glaciar/Sinóptico
(`docs/design-system/`, agora só histórico). Implementação em `apps/app/src/shared/ui/` (tokens, componentes e
`moduleColors`, que converte os matizes oklch dos módulos para hexadecimal).

- **Fonte original:** artifact "Glife Design System" no Claude (Cobalto · Mobile · v1.0 · nov 2026), exportado do
  Claude Design.
- **Tokens:** `tokens.css` (claro e escuro, cor, sombra, fonte e movimento). É a referência para
  `apps/app/src/shared/ui/theme/tokens.ts`.
- **Protótipo navegável:** `docs/prototipos/redesign-cobalto/` (63 telas e 38 folhas, celular e web, claro e escuro).
  Cada tela tem uma ficha com rota, estados, regras e movimento. Detalhes em `docs/prototipos/redesign-cobalto.md`.

## Princípios

1. **Respiro.** Margem de 20 px na tela e 24 px entre blocos. Uma ação principal por tela.
2. **Clareza.** Números grandes e rótulos curtos. A cor aparece onde existe uma decisão a tomar.
3. **Gentileza.** Texto próximo e calmo, nunca alarmista. Até atraso é dito com naturalidade.

## Cor

| Papel | Claro | Escuro | Uso |
|---|---|---|---|
| `bg` | `#F1F3F6` | `#0C0F15` | Fundo do app |
| `card` | `#FFFFFF` | `#161B24` | Cartões, grupos de lista, folhas, barra de abas |
| `fg` / `fg-2` / `fg-3` / `fg-4` | `#0E1116` / `#4B5260` / `#636A77` / `#9AA0AB` | `#EEF1F6` / `#C3C9D4` / `#98A1B0` / `#646D7D` | Texto principal, corpo, secundário, desabilitado |
| `line` | `#ECEEF2` | `#232A37` | Divisórias (1 px) |
| `border` / `track` | `#C9CED8` / `#E6E9EE` | `#3A4252` / `#262D3A` | Contorno de controles; trilho de barras |
| `accent` (cobalto) | `#2D5BFF` (pressionado `#2349DB`) | `#3F68FF` (pressionado `#2F57EE`) | Fundo da ação principal e do item ativo |
| `accent-text` | `#2D5BFF` | `#8FA7FF` | Link e ícone de destaque sobre superfícies |
| `tonal` / `tonal-fg` | `#E2E8FF` / `#1F3FB8` | `#1B2650` / `#B7C5FF` | Ação secundária, aba ativa, bloco da IA |
| `inverse` | `#0E1116` | `#131F57` | Momentos de destaque (cartão da fatura, aviso) com números em `#9DB2FF` |
| Estado | ok `#15803D`/`#DCF2E4`, alerta `#7A5000`/`#FCEFD6`, erro `#A3322A` (`#C2453D` em anéis)/`#FBE3E1` | ok `#62D394`/`#10301F`, alerta `#F1C46B`/`#33270F`, erro `#FF948A`/`#3B1917` | Só quando carrega significado |
| `scrim` | `rgba(14,17,22,.36)` | `rgba(0,0,0,.58)` | Atrás de folhas e diálogos; sem desfoque |

**Cor por módulo:** cada módulo tem um matiz usado só em ícones e blocos suaves:
`oklch(L C h)` com fundo `L .95 · C .035` e ícone `L .47 · C .13` no claro, e fundo `L .31 · C .05` e ícone
`L .85 · C .10` no escuro. Matizes: Notas 80, Agenda/Lembretes 25, Finanças 160, Investimentos 205, Bíblia 350,
Dieta 130, Anotações 305, Compras 55, Galeria 240. A IA usa o tonal cobalto.

**Gráficos:** neutros (cinza) e o cobalto só no dado que importa (mês atual, item tocado). Previsto = listrado.
Estouro de orçamento = vermelho só no número e na barra que estourou.

**Marca-texto da Bíblia:** amarelo 95, verde 150, azul 250, rosa 350 em `oklch(.92 .07 h)` (claro) e
`oklch(.40 .07 h)` (escuro).

O tema escuro **não vem do design system original** (ele só define o claro): foi derivado no protótipo mantendo
contraste AA. Precisa de validação do usuário em aparelho real.

## Tipografia

- **Outfit** (400/500/600/700) em toda a interface; tracking negativo nos tamanhos grandes; **números tabulares** em
  valores, horas e datas.
- **DM Mono** só para rótulos técnicos e contadores.
- **Leitura bíblica em Outfit** (decisão do usuário em 27/11/2026: mesma fonte do app). Ajustes em "Aa": tamanho 15–26,
  entrelinhas 1,6–2,4 e espaço entre letras; grifos com respiro de max(0,42 em, 4 px) entre as linhas.

| Estilo | Tamanho/entrelinha | Peso | Tracking |
|---|---|---|---|
| Número | 44/46 (40/44 no topo das telas) | 700 | −2 |
| Título 1 | 32/36 | 600 | −1,2 |
| Título 2 | 24/30 | 600 | −0,6 |
| Título 3 (seção) | 20/26 | 600 | −0,4 |
| Ênfase | 16/22 | 600 | 0 |
| Corpo | 16/24 | 400 | 0 |
| Apoio | 14/20 | 400–500 | 0 |
| Legenda | 12/16 | 400–600 | 0 (rótulos em caixa alta: +0,5) |
| Leitura | 19/36 Outfit (ajustável) | 400 | 0 |

## Espaço e forma

- Grade de 4 px: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48. Margem da tela 20 px (24 px no web); 24 px entre blocos; 16–18 px
  dentro de cartões; linhas de lista com 12 px verticais e altura mínima de 56 px. Toque ≥ 44 px.
- Raios: check 7 · chip/segmento 10 · bloco de ícone 13–14 · campo 16 · campo grande 18 · bloco de atalho 20 ·
  cartão 22–24 · diálogo/barra de abas 26 · folha 28 (só em cima) · pílula 999 (botões, chips, busca, compositor).
- **Cartões existem** (mudança em relação ao Glaciar): brancos, sem borda e sem sombra. Lista agrupada = um cartão
  com divisórias de 1 px recuadas até o texto (52 px quando há ícone).
- **Sombra só no que flutua:** nível 1 (dia ou segmento ativo), nível 2 (barra de abas, aviso, botão +, CTA cobalto
  com sombra azulada), nível 3 (folha, diálogo). Nada de gradiente, exceto a faixa de proteção atrás de compositores
  e botões presos no rodapé (transparente → `bg`).

## Ícones e marca

- **Lucide** contorno, traço forçado em 1,5, `currentColor`. Tamanhos 16 · 20 · 24; 19 dentro de blocos de 40 px;
  22–26 nos atalhos.
- Ícones de módulo: `sticky-note`, `calendar-check`/`alarm-clock`, `wallet`, `trending-up`, `book-open`, `salad`,
  `shopping-basket`, `images`. `sparkles` marca ações de IA.
- **Mascote** (G com olhos) é a marca e a cara da IA: estados vazios, conquistas e IA; nunca dentro de listas ou
  formulários. Humores: normal, feliz, pensando, dormindo; pisca a cada 4 s, flutua 1,4 s em estados vazios.
- Sem emoji, sem PNG, sem fotos ou ilustrações decorativas.

## Componentes

Base (`shared/ui`): `Text`, `Icon`, `Mascot`, `ModuleIcon`, `Button` (primário, tonal, neutro, perigo; tamanhos 52,
44 e 36), `IconButton` (círculo de 42), `Fab`, `TextField`/`Input` (anel de foco 2 px cobalto + halo tonal de 6 px;
erro em anel vermelho), `SearchField`, `MoneyField` (valor grande, teclado do aparelho), `SegmentedControl` (trilho +
indicador que desliza), `Chip` (marcado sem mudar tamanho), `Switch`, `Checkbox`, `Radio`, `TopBar` (voltar circular +
título central), `PageHeader` (rótulo + título 32), `DayStrip`, `BottomNav` flutuante, `SectionHeader` (título 20 +
ação em link), `ListGroup`, `ListItem`, `TaskItem` (riscar e recolher), `Card`, `ModuleTile`, `StatValue`,
`ProgressBar` (com previsto listrado), `ProgressRing`, `AIInsight`, `ChatBubble`, `ChatComposer`, `AskBar`,
`TypingDots`, `Toast` (tinta, com "Desfazer"), `Alert`, `StatusBadge`, `EmptyState` (mascote + frase + ação),
`Sheet`, `Dialog`, `LinkPanel` (Vínculos: "Liga para" e "Mencionada em").

## Navegação

- **Celular:** barra de abas flutuante (r26, 14 px das laterais, 20 px do rodapé) com **Início · Agenda · + ·
  Notas · IA**. O **+** (quadrado cobalto r18) abre a captura e gira 45° ao abrir. Finanças, Bíblia, Dieta,
  Compras, Investimentos e Galeria ficam em "Seus espaços" no Início e na busca.
- **Web:** barra no topo de 64 px (marca, Início · Agenda · Notas · Finanças · Bíblia · Glife IA, busca com Ctrl+K e
  +), conteúdo numa coluna de 720 px, folhas como janelas centralizadas de 560 px.

## Movimento ("curto e gentil")

- Durações 90 · 160 · 240 · 400 · 500 ms. Curvas: padrão `(.2,0,0,1)`, entrada `(.05,.7,.1,1)`, saída
  `(.3,0,.8,.15)`, mola `(.34,1.56,.64,1)`. Saída ≈ 60% da entrada.
- Toque: tudo que é tocável vai a 0,96 em 90 ms e volta com mola em 380 ms; o primário escurece.
- Listas: sobem 18 px em cascata de +70 ms por item (no máximo 6). Pop: escala 0,92 → 1 com mola em 380 ms.
- Empurrar tela: a nova entra da direita e a anterior recua 30% com véu (420 ms). Trocar de aba: esmaecer + escala
  0,94, sem direção. Folha sobe em 400 ms (entrada) e desce em 240 ms (saída). Cartão que vira tela: 500 ms.
- Aviso sobe com mola em 480 ms. Valores contam até o número. Barras crescem da esquerda/de baixo em 800 ms.
- Reduzir movimento: tudo vira esmaecer de 160 ms.
- Diferença para o Glaciar: as molas de 200–350 ms dão lugar a durações e curvas fixas; no Reanimated use
  `withTiming` com `Easing.bezier(...)` e `withSpring` só onde o original usa a curva de mola.

## Texto

pt-BR, informal e próximo, em segunda pessoa ("você"); a IA fala como "eu". Caixa de frase em tudo. Botões com 1–2
palavras, verbo primeiro ("Pagar", "Adiar", "Desfazer"). Dinheiro `R$ 15.998,80`, saída com sinal de menos real
(`− R$ 318,60`), entrada `+ R$ 5.000,00` em verde. Datas `26/11`, `Sex, 27/11 · 14:30`; metadados separados por
` · `. Placeholders terminam em reticências ("Escreva ou fale…").
