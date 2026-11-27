# Bíblia v2: leitor em Outfit, início com busca, planos de leitura e registros — design

Data: 27/11/2026 · Fase 4 (segunda etapa) · Branch `fase-4-biblia` (continua a primeira etapa, ainda não juntada).
Protótipo aprovado: `Desktop/Glauber/glife-redesign/biblia/glife-biblia-v2_2026-11-27.html` (artifact
"Glife Bíblia v2"). Base: `docs/superpowers/specs/2026-11-26-biblia-leitor-design.md` (primeira etapa) — tudo o que
ela decidiu continua valendo, salvo o que este documento muda.

## Intenção (palavras do usuário)

"As fontes da Bíblia devem ser as mesmas do app; com a Bíblia aberta deve ser um visual clean, sofisticado, com bom
respiro entre as linhas de forma que os marca-textos tenham uma margem entre as linhas; opção de mudar o tamanho das
letras, o espaçamento entre as linhas e entre as letras." Primeira tela da Bíblia "sofisticada e intuitiva": buscar
versículo por texto, criar ou executar plano de leitura por dia, mais de um plano, últimos registros (anotação,
sublinhado ou grifo). Ajustes pedidos sobre o protótipo: seleção de versículo sem borda, "tipo um sobretom"; Antigo e
Novo Testamento visíveis ao abrir (logo abaixo da busca); textos de campos e botões nunca cortados.

## Decisões do usuário nesta conversa

1. Bíblia **toda em Outfit**; a Literata sai do app (regra do AGENTS.md e token `scripture` mudam). Autorizado.
2. Leitor com **um versículo por linha** (bloco por versículo). O modo "parágrafo" do protótipo **não** entra.
3. O dia do plano **avança pelo calendário**: dia não lido fica "perdido" no histórico e pode ser recuperado.
4. Planos guardados como **regra + leituras feitas** (abordagem A abaixo). Migração no Supabase autorizada.
5. Ordem de entrega: (1) leitor, (2) início da Bíblia com busca e registros, (3) planos.

## Objetivos

1. Leitor limpo: fundo "papel" (cor de cartão), cabeçalho do capítulo com o número grande em peso leve, sem cartões
   sobre o texto; barras de cima e de baixo somem ao rolar para baixo e voltam ao subir.
2. Ajustes de leitura ("Aa"), salvos no aparelho: tamanho 15–26 (padrão 19), entrelinhas 1,60–2,40 (padrão 1,90),
   espaço entre letras −2% a +10% (padrão 0), números dos versículos liga/desliga, "Restaurar padrão". O texto muda
   ao vivo atrás da folha.
3. Grifos com respiro: o fundo do marca-texto nunca encosta na linha vizinha — sobra ~0,42 em entre as faixas, em
   qualquer ajuste. Sublinhado na cor da marcação, afastado do texto.
4. Seleção = **sobretom**: camada cobalto translúcida sobre o versículo (e por cima do grifo, sem esconder a cor),
   sem borda. Selecionar não mexe no layout.
5. Barra de seleção em três linhas (referência + fechar · modo marca-texto/sublinhado + 4 cores · Anotar, Copiar,
   Apagar e as ações registradas), cabendo em 360 dp.
6. Início da Bíblia, nesta ordem: topo (voltar, tradução, livros), título, **busca**, **Antigo/Novo Testamento** (lista
   de duas linhas), **Leitura de hoje** (carrossel de planos + "Criar plano"), **Continuar lendo**, **Últimos
   registros** (filtro Todos · Anotações · Grifos · Sublinhados), crédito da tradução.
7. Busca no texto: palavra, frase (todas as palavras presentes) ou referência ("Sl 23", "Jo 3:16"); sem acento vale;
   filtro Toda a Bíblia / AT / NT; resultados agrupados por livro com o termo destacado; buscas recentes.
8. Planos: vários ao mesmo tempo; criar (modelo, nome, livros, duração, dias da semana, início, lembrete); executar
   por dia (ler pelo leitor e "Marcar como lido", ou marcar na lista do dia); detalhe com progresso, sequência,
   próximos dias, histórico, recuperar dia perdido, lembrete, pausar, excluir; concluídos com "Refazer".
9. Registros: tela com todos os grifos, sublinhados e anotações, agrupados por período (Hoje, Ontem, Esta semana,
   Antes); tocar abre o leitor no versículo com um brilho rápido.

## Fora do escopo

Editar versículo / ver original, ouvir, comparar traduções, grifo de parte do versículo, índice de
busca persistente (FTS), IA, modo parágrafo, tema sépia. Planos com livros escolhidos um a um ("Escolher livros")
ficam como evolução: nesta etapa o plano é feito de **grupos de livros**.

## Anti-objetivos

- Grifos que se tocam entre linhas no Android (o motivo da escolha "versículo por linha").
- Texto de botão ou campo cortado em 360 dp; botão que quebra o rótulo.
- Selecionar ou marcar que mexe no layout.
- Texto bíblico copiado para o banco; anotação guardada fora das notas (continua: **Anotar cria nota comum ligada**).
- Plano que gera centenas de linhas no banco; edição de plano que duplica dias entre aparelhos.
- Bundle JS do web inchado com o texto.

## Abordagens consideradas

**Layout dos grifos**
- **Versículo por linha + faixas desenhadas por linha (escolhida).** Cada versículo é um `Text` próprio; com
  `onTextLayout` o app sabe as linhas (x, y, largura, altura) e desenha por trás uma faixa arredondada por linha,
  centrada e mais baixa que a altura da linha. Respiro igual no Android e no web.
- Parágrafo com fundo do span: no Android o `BackgroundColorSpan` ocupa a linha inteira — faixas coladas. Descartada.
- Parágrafo no web e bloco no Android: duas aparências. Descartada.

**Guardar planos**
- **A. Regra + leituras feitas (escolhida).** `bible_plans` guarda a regra; `bible_plan_reads` guarda cada capítulo
  lido. O cronograma é calculado no domínio. Pouco sync; editar a regra só recalcula.
- B. Gerar uma linha por dia ao criar: 365 linhas por plano, edição = regenerar, risco de duplicar. Descartada.
- C. Só no aparelho: perde ao trocar de celular, web não vê. Descartada.

**Busca no texto**
- **Varredura em memória (escolha do assistente).** Na primeira busca carrega os 66 livros da tradução atual pela
  mesma interface `BibleTextSource`, normaliza (minúsculas, sem acento) e guarda em memória; busca linear (~31 mil
  versículos). Sem esquema novo. Mostra "Preparando a busca…" na primeira vez.
- Índice FTS5 local-only: mais rápido em buscas repetidas, mas exige tabela local e reindexar por tradução. Fica como
  evolução se a primeira carga incomodar.

## Como funciona

### 1. Fonte e tokens

- `tokens.ts`: `scripture` passa a Outfit regular; `readingTitle` vira Outfit; o cabeçalho do capítulo ganha variante
  própria (número 76/76, peso 200, tracking −3; nome do livro 12 caixa-alta, tracking 0,22 em). Fonte Outfit 200
  (ExtraLight) passa a ser carregada. A Literata sai de `fonts`, do `_layout` e do `package.json`.
- `AGENTS.md` (Interface e movimento): "Outfit em tudo (DM Mono em rótulos técnicos)" — remover "Literata só na
  leitura bíblica". Atualizar a ficha em `docs/design-system-cobalto/` onde citar Literata.
- Tokens novos: `selectionTone` (claro `rgba(45,91,255,0.12)`, escuro `rgba(143,167,255,0.20)`), `paper` (claro
  `#FFFFFF`, escuro `#0F1219`), `ink` (claro `#171B22`, escuro `#E6E9F0`), faixa de respiro `highlightGapEm = 0.42`.
  Cores dos grifos continuam as de `highlight`/`highlightLine`.

### 2. Preferências de leitura

`readingPrefs.ts` ganha `fontSize` (15–26), `lineHeight` (1,6–2,4, passo 0,05), `letterSpacing` (−2…10, em % do
tamanho) e `verseNumbers` (bool), validados no `parseReadingPrefs` (valor fora da faixa volta ao padrão). Locais ao
aparelho, como hoje. Corrige junto o ajuste adiado: a preferência lida no arranque não pode desfazer uma escolha feita
antes de a leitura terminar (mesclar, não substituir).

### 3. Leitor

- `ReaderScreen` com fundo `paper`; topo próprio (voltar · "Salmos 23 ⌄ / BLIVRE" abre livros · buscar · "Aa") e a
  barra de baixo (anterior · título · próximo) somem ao rolar para baixo e voltam ao subir ou no topo.
- Dentro de um plano (`?plano=<id>`): faixa "Nome do plano · dia N" acima do cabeçalho; no fim do capítulo, cartão
  "Leitura k de n de hoje · depois, Salmos 25" com **"Marcar como lido"** (último do dia: "Concluir o dia N").
  Marcar avança para o próximo capítulo não lido do dia (troca de rota, sem empilhar) ou, no último, volta à tela de
  origem com aviso "Dia N concluído · X dias seguidos". Fora de plano: cartão "A seguir · próximo capítulo".
- `VerseRow` reescrito: número do versículo (variante micro, terciário, alinhado ao topo da 1ª linha; some se
  desligado) + `Text` com os ajustes; `onTextLayout` → linhas; por trás, uma `View` por linha com a faixa:
  altura = `lineHeightPx − gap`, onde `gap = max(0,42 em, 4)` e não maior que a altura da linha menos a caixa do texto;
  cantos `radius.iconSmall`. Grifo = cor `highlight[c]`; selecionado = `selectionTone` (por cima do grifo, quando
  houver); sublinhado = `textDecoration` com `highlightLine[c]` (no web, `textUnderlineOffset`). Marcador de notas
  ligadas continua no fim do versículo.
- Brilho ao abrir com `?v=`: faixa em `accentSoft` que esmaece em 1,6 s (já existe `FLASH_MS`).
- Folha "Leitura" (`Sheet` com véu claro) com os três controles deslizantes, o interruptor e "Restaurar padrão".
  Precisa de um componente `Slider` em `shared/ui` (não existe): trilho 6, preenchimento cobalto, botão 26, passo,
  rótulo acessível, valor mostrado à direita do título.
- `PassageBar` em três linhas como o protótipo; "Remover" vira **"Apagar"**; ações registradas (Anotar, Copiar…)
  entram na terceira linha. O modo (marca-texto/sublinhado) é um controle de dois ícones na segunda linha.

### 4. Início da Bíblia

- `BibleHomeScreen` refeita na ordem do objetivo 6. A busca é um campo-botão (abre `/biblia/busca`). AT/NT é um
  `ListGroup` com duas `NavRow` ("39 livros · Gênesis a Malaquias" / "27 livros · Mateus a Apocalipse") que abrem a
  `BooksSheet` já no testamento.
- "Leitura de hoje": carrossel horizontal com encaixe (cartão = largura − 40) e pontos; cada cartão: ícone com a cor
  do plano, "Dia N de M · P%", nome, sequência, trecho do dia em destaque, chips dos capítulos (lido = verde com
  check; próximo = contorno), barra de progresso, botão "Ler agora · Salmos 23" / "Continuar · Salmos 24", ou caixa
  "Dia N concluído. Amanhã: …" com o mascote feliz. Último cartão: "Criar plano". Sem planos: só o cartão de criar.
- "Continuar lendo": último capítulo/versículo aberto (as preferências passam a guardar o versículo).
- "Últimos registros": 4 itens mais recentes do filtro; "Ver todos" abre `/biblia/registros`.

### 5. Registros (feed)

Junta duas fontes, ordenadas por data (mais recente primeiro):
- grifos e sublinhados: `bible_highlights` vivos, data = `updated_at`; versículos seguidos com a mesma marca e o
  mesmo minuto viram **um** registro ("Salmos 23:2–3");
- anotações: notas ligadas a versículos da Bíblia (links com `target_type = 'bible'`, origem do menu Anotar ou
  `[[Sl 23:4]]` no texto), data = atualização da nota, título/trecho resolvidos pela fonte de itens do `links`.
  Exige no `links` (domain + feature) um `watchBibleAll(listener)` (hoje só existe `watchBibleBook`).
Uma nota ligada a vários versículos vira **um** registro (referência do primeiro trecho + "e mais N").
Cada linha: bloco do tipo (grifo na cor, sublinhado com traço na cor, anotação tonal), referência, etiqueta "Grifo ·
amarelo", trecho do versículo já com a marca (grifo/sublinhado) ou o texto da nota, tempo relativo. Toque: grifo →
leitor no versículo; anotação → a nota.

### 6. Busca

Rota `/biblia/busca`. Campo com foco ao abrir, botão limpar só com texto. Referência reconhecida (`parseBibleRef`)
aparece no topo como atalho escuro "Ir para a referência". Texto: tokens com 2+ letras, todos presentes no versículo
(normalizado). Até 200 resultados, agrupados por livro (12 por grupo + "ver mais"), termo destacado em tonal. Buscas
recentes (até 6, locais). Carga: serviço em `features/bible/data/textIndex.ts` com cache em memória por tradução;
trocar de tradução descarta. Busca roda fora do toque (debounce 200 ms).

### 7. Planos

**Banco (migração nova `…_biblia_planos.sql`, padrão do AGENTS.md):**

`bible_plans`: `name text (1–60)`, `groups text[]` (códigos de grupo, ver abaixo), `days int (1–730)` = **dias de
leitura** (não de calendário; com todos os dias da semana marcados os dois coincidem, e os modelos usam todos),
`weekdays int[]` (0=domingo…6, 1–7 itens, sem repetição), `start_date date`, `reminder_time text null`
(`HH:MM`), `color_hue int` (um dos tons da paleta fixa de planos em `tokens.ts`, escolhido em rodízio ao criar —
sem campo de cor na tela), `pauses jsonb not null default '[]'` (lista de períodos `{from: date, to: date|null}`;
`to` nulo = pausado agora; check de formato), `completed_at timestamptz null`, mais as colunas padrão e
`vida_apply_standard`.

`bible_plan_reads`: `plan_id uuid` (FK composta → `bible_plans`; leituras de plano excluído são ignoradas),
`ref text` (capítulo OSIS `PSA.23`), `read_on date` (dia do calendário em que foi marcada), padrão +
`vida_apply_standard`. Sem unique (sync offline); leitura duplicada do mesmo `plan_id+ref` conta uma vez.
Desmarcar = exclusão lógica de todas as linhas vivas daquele `plan_id+ref`.
As duas na publicação `powersync` e no `sync-streams.yaml` (filtro do usuário + `aal2`), republicar no painel.

**Domínio (`packages/domain/src/bible/plans.ts`, TS puro com testes):**
- Grupos fixos com os livros na ordem canônica: Pentateuco (187 cap.), Históricos (249), Poéticos (243),
  Profetas (250), Evangelhos (89), Atos (28), Cartas de Paulo (87), Cartas gerais (34), Apocalipse (22) = 1.189.
- `schedule(plan)`: lista ordenada de capítulos dividida em `days` dias de leitura o mais igual possível (os
  primeiros dias levam o capítulo a mais); dias de leitura = datas a partir de `start_date` cujo dia da semana está em
  `weekdays` **e que não caem dentro de um período de `pauses`** (a pausa empurra os dias seguintes e o término; as
  datas de antes da pausa não mudam). Devolve, por dia do plano: data, capítulos e rótulo ("Salmos 23–27",
  "Rute 4 a 1 Samuel 2").
- `status(plan, reads, hoje)`:
  - **dia concluído** = todos os capítulos daquele dia no cronograma atual têm leitura, em qualquer data;
  - **perdido** = dia com data passada e não concluído; ler depois ("recuperar") tira de perdido;
  - **sequência** = dias de leitura seguidos, até hoje, concluídos **até a própria data** (`read_on` ≤ data do dia);
    recuperado não refaz a sequência; dia de hoje ainda aberto não quebra a sequência;
  - **dia atual** = o dia de leitura de hoje; se hoje não é dia de leitura ou o plano está pausado, o próximo;
  - progresso = capítulos lidos ÷ total; término = data do último dia; concluído = todos lidos.
- **Ler adiantado vale:** dá para marcar capítulos de qualquer dia (lista "próximos dias", leitor). Se o dia de hoje
  já foi todo lido antes, o cartão mostra "Dia N concluído".
- Recuperar dia perdido: abre o leitor nos capítulos daquele dia, no modo plano; não muda o calendário (o "soma à
  leitura de amanhã" do protótipo **não** entra).
- Modelos: Bíblia em 1 ano (todos, 365), Novo Testamento em 90 dias, Evangelhos em 30 dias, Personalizado.
- **Editar plano** (lápis no detalhe, reaproveita a tela de criação em modo edição): nome, lembrete, duração e dias
  da semana. Livros e data de início ficam fixos depois de criado (para mudar, cria outro plano). Leituras continuam
  valendo pelo `ref`; o resumo avisa quantos dias passados ficariam perdidos antes de salvar.
- **Refazer** um plano concluído = cria um plano novo com a mesma regra, começando hoje (o concluído fica no
  histórico).
- **Pausar/retomar** grava um período em `pauses`; enquanto pausado o plano some de "Leitura de hoje" e não gera
  perdidos; a sequência fica como estava.

**Telas:** `/biblia/planos` (Em andamento | Concluídos, modelos, criar), `/biblia/planos/novo` (uma tela, resumo
ao vivo no rodapé: capítulos · ritmo "≈ 3 cap./dia" · termina em), `/biblia/planos/[id]` (anel de progresso, hoje
como checklist com Ler/Reler, próximos 3 dias, histórico em grade, recuperar dia, lembrete, pausar, excluir).
Pausado: some de "Leitura de hoje" e não gera perdidos enquanto pausado (os dias pausados empurram o término).

**Lembrete:** notificação local no horário do plano, pelos `shared/lib/notices`, só em **dias de leitura** que ainda
não estão concluídos, em plano ativo (não pausado, não concluído). Texto "Leitura de hoje: Salmos 28–32"; tocar abre
`/biblia/planos/<id>` (incluir nas rotas seguras). Sem botão de ação na notificação. Exige um tipo novo de
`NoticeRef` (`plan`) em `domain/time`, `parseNoticeRef` e no `NoticesSync` da feature `today`, que passa a pedir os
avisos dos planos ao `bible` pelo `index.ts`. Cada plano gera no máximo um aviso por dia dentro da janela atual
(7 dias / 60 avisos, dividida com agenda e dieta). Recalcula ao criar/editar/pausar/excluir, ao marcar leitura e ao
abrir o app. Só no Android (web não agenda).

## Restrições

- Regras do AGENTS.md: rotas finas, features só pelo `index.ts`, `links` como ponte, domain sem React, só tokens,
  `makeStyles`, componentes de `@/shared/ui`, movimento curto e gentil, modo escuro, conferir em 360 dp, teclado
  nunca cobre campo, ação que grava várias coisas é tudo ou nada.
- Migração nova (nunca editar a já aplicada); RLS com `vida_apply_standard`; FK composta.
- Repositório público: nada de ref do Supabase nem URLs no código.
- Testes: domain (cronograma, status, sequência, perdidos, grupos somando 1.189), preferências, busca (normalização,
  frase, referência), banco no PGlite (RLS das duas tabelas).

## O que fica para o construtor

Divisão em tarefas e commits; nomes internos de componentes; o mecanismo exato do carregamento dos 66 livros para a
busca; detalhes de animação dentro das regras de movimento; o layout fino de cada tela seguindo o protótipo.

## Decisões do assistente (para conferir)

Tomadas na revisão do documento, sem mudar o que foi pedido; contestar qualquer uma muda o plano:
1. Pausa guardada como lista de períodos (`pauses`): empurra os dias seguintes e o término, sem mexer no passado.
2. "Refazer" cria um plano novo com a mesma regra (o concluído fica no histórico).
3. Dia concluído = capítulos lidos em qualquer data; sequência só conta o que foi lido até a data do dia; ler
   adiantado vale.
4. "Recuperar dia" só abre o leitor naquele dia (o "somar ao dia seguinte" do protótipo sai).
5. Editar plano: nome, lembrete, duração e dias da semana; livros e início fixos.
6. Duração = dias de leitura (como no protótipo); cor do plano automática.
7. Lembrete só em dia de leitura não concluído, sem botão de ação.
8. Busca por varredura em memória, sem índice persistente nesta etapa.
