# Botão central da Glife IA, anexos, versículos e previsto no Início — design (28/11/2026)

Branch `integracao-ia-investimentos` (IA dos PRs #3–#5 + Investimentos v2 já juntados sobre o master).

## Intenção

Tornar a Glife IA o gesto principal do app (botão do mascote no centro da barra, com texto e voz), deixar a
leitura da Bíblia mais fluida (troca de capítulo suave e referências tocáveis) e mostrar no Início o saldo
esperado do mês. Pedidos do usuário; decisões dele marcadas com (U), as minhas com (C).

## 1. Troca de capítulo mais suave

- Hoje: `router.replace` com a transição nativa de tela inteira (`ios_from_right`, 420 ms) — a barra de cima e a
  de baixo também deslizam, o que dá o "tranco".
- Novo (C): trocar de capítulo **dentro da mesma tela** (`router.setParams`), sem transição de pilha. As barras
  ficam paradas; só a coluna de texto troca: entra com esmaecer + deslocamento curto (`t.motion.enterOffset`,
  vindo da direita no próximo e da esquerda no anterior) em `t.motion.gentle` (300 ms) com `t.easing.enter`.
  Reduzir movimento: só esmaecer em `t.motion.reduced`. Histórico continua igual (replace não empilhava).
- Alternativas descartadas: só alongar a transição nativa (as barras continuam se mexendo); pager com arraste
  (mudança grande, não pedida).

## 2. Saldo esperado no cartão de Finanças do Início (U: "saldo esperado no fim do mês")

- `TodayFinanceBlock` ganha a linha "Esperado em DD/MM: R$ X", com o mesmo cálculo da tela de Finanças
  (`monthOverview(...).expected`, via `useFinance` + `useOccurrences`). Sem contas, a linha não aparece.

## 3. Botão da Glife IA no centro da barra (U)

- Barra: Início · Agenda · **mascote** · Notas · **Finanças** (U). A aba IA sai; a conversa vira tela de pilha
  `/ia` (com voltar). A captura "+" continua no Início ("Caixa de entrada") e no topo do web.
- `shared/navigation/TabBar` não conhece features: recebe o botão central por prop (`center`), que a rota
  `(tabs)/_layout` preenche com `GlifeAiButton` de `features/ai`.
- Gestos do mascote (C, no estilo de gravação do WhatsApp):
  - **Toque**: abre um compositor flutuante sobre a barra (cartão r24, sombra de flutuante) com campo de texto
    focado, botão de anexo e enviar. Enviar → abre `/ia` e manda o pedido.
  - **Pressionar e segurar** (≥ 250 ms): começa a ouvir; faixa acima da barra mostra o texto transcrito ao
    vivo, o tempo e "deslize para cima para travar" com cadeado. **Soltar** envia.
  - **Segurar e arrastar para cima** (≥ 64 dp): trava; dá para soltar o dedo. A faixa mostra "Cancelar" e
    "Enviar"; só envia ao tocar em Enviar.
  - Sem permissão do microfone ou sem reconhecimento: aviso curto e cai no compositor de texto.
  - Haptics leve ao começar, travar e enviar.
- Voz (U): `expo-speech-recognition`, reconhecimento no aparelho/navegador em pt-BR; nada de áudio é gravado
  nem enviado pelo app — só o texto vai para a IA (pela máscara já existente). Exige **APK novo**.
- O pedido vai para a tela `/ia` por um "pedido pendente" em memória (não pela URL, para não expor texto).
- Prototipagem desta interface fica registrada como pendente (U: seguir o design system).

## 4. Anexos na conversa da IA (U)

- Aceita PDF, TXT, MD e CSV (U). Até **60 mil caracteres por anexo** (U), até 3 por mensagem e 120 mil no total
  da mensagem (C); acima disso o app avisa e corta, dizendo o que foi cortado.
- TXT/MD/CSV: lidos no aparelho. PDF: o texto é extraído por uma Edge Function nova `extract-text` (C — não há
  leitor de PDF confiável no React Native; a função exige login aal2, recebe até 10 MB, devolve só o texto, não
  grava nem registra o conteúdo). Usa `unpdf`.
- O texto entra na mensagem como parte de texto marcada `[Anexo: nome]` e passa pela mesma máscara de dados
  pessoais; na bolha aparece só um chip com o nome e o tamanho.
- Servidor: `MAX_BODY` sobe de 200 mil para 400 mil caracteres (C) para caber anexos + histórico; o teto em
  dólar e a reserva por pedido continuam valendo (o pedido grande reserva mais).
- Imagens: fora (o modelo só lê texto).

## 5. Referências cruzadas no texto do versículo

- A tradução Livre traz referências no próprio texto ("…de esquina, Salmo 118:22", "Lucas 10:7; Levítico
  19:13"). Novo `findBibleRefs(text)` no domain acha referências em texto corrido (nome ou abreviação do livro,
  com e sem acento, `cap:vers`, intervalos e listas com `;` e `,`).
- `VerseRow` mostra cada referência como link (cor de ação, sublinhado leve) que abre o capítulo no versículo
  (`router.push`, com voltar para onde estava). O toque no resto do versículo continua selecionando.

## 6. Pendência ligada à junção

- Detalhe do ativo: ligar "Perguntar à Glife IA" (pendente desde Investimentos v2) para abrir `/ia` com um
  pedido pronto sobre o ativo.

## Fora do escopo

Imagens nos anexos, troca de modelo, pager com arraste na Bíblia, guardar o arquivo anexado.

## Testes

Domain: `findBibleRefs`, limites de anexo. App: gestos do botão (máquina de estados pura e testada), pedido
pendente, linha do esperado, links no versículo. Função: `extract-text` (auth, tamanho, tipo). Verificação
final: `pnpm lint && pnpm typecheck && pnpm test` e conferência no navegador do que der sem login.
