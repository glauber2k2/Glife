# Bíblia integrada: leitor, grifos coloridos e anotações como notas — design

Data: 26/11/2026 · Fase 4 (primeira etapa) · Branch nova a partir de `fase-r2`.

## Intenção (palavras do usuário)

"Eu grifo, diferentes cores, anoto observações em versículos que acho interessante, quero que isso se torne nota,
e fique vinculado ao versículo e vice-versa." Futuramente haverá IA: tocar no versículo ou no capítulo abre um menu
com anotar, grifar, resumo com IA etc. "Não quero que as notas sejam separadas por tipos, nota é nota, porém
interligada aos itens."

## Objetivos

1. Ler a Bíblia inteira dentro do app, offline, no web e no Android: traduções livres embutidas (BLIVRE…) e traduções importadas pelo usuário (só no aparelho), alternando entre elas; crédito visível.
2. Tocar num versículo (ou no título do capítulo) abre um **menu de ações** do trecho.
3. Grifar o versículo em 4 cores (amarelo, verde, azul, rosa) ou sublinhar; trocar a cor; remover. Sincroniza entre aparelhos.
4. **Anotar = criar uma nota comum** já ligada ao versículo. A nota aparece em Notas como qualquer outra.
5. Vínculo nos dois sentidos: o versículo mostra as notas ligadas a ele (as criadas pelo menu e qualquer nota que
   cite `[[Jo 3:16]]`, inclusive trechos `[[Jo 3:16-18]]` e capítulo `[[Jo 3]]`); tocar no link dentro da nota abre
   o leitor naquele versículo.
6. O menu é extensível: a IA (Fase 6) acrescenta ações sem mexer no leitor.

## Fora do escopo agora (resto da Fase 4)

Devocional SOAP e linha do tempo, planos de leitura, busca no texto da Bíblia, editar versículo / ver original,
grifo de parte do versículo (o banco já reserva), ouvir, comparar traduções lado a lado, IA.
**Não** mexer nos tipos de nota existentes (`note/journal/devotional`): a anotação nasce como nota comum (`note`).

## Anti-objetivos

- Texto bíblico copiado ou alterado no banco do usuário (o original é só leitura; camadas separadas).
- Anotação guardada em dois lugares (nada de tabela de anotações espelhando notas).
- Bundle JS do web inchado com o texto inteiro.
- Menu que desloca o texto ou que muda de tamanho ao marcar uma cor.

## Abordagens consideradas

- **A. Anotação é uma nota de verdade (escolhida pelo usuário).** Uma fonte só; reaproveita editor, lixeira, busca,
  sync e o grafo de links.
- B. Tabela de anotações + nota espelhada: texto duplicado, conflitos de sync. Descartada.
- C. Anotação separada com "transformar em nota": o vínculo dependeria de lembrar de converter. Descartada.

## Como funciona

### Texto (somente leitura)

- `tools/bible-import/`: script Node que lê o USFM da BLIVRE (baixado do ebible.org, com OK do usuário) e gera um
  JSON por livro: `{ book: "JHN", chapters: [[ "v1", "v2", … ], …] }` (texto limpo: sem notas de rodapé, marcas de
  Strong ou cabeçalhos; títulos de seção ficam de fora nesta etapa). Teste: conta 66 livros e ~31 mil versículos e
  confere alguns versículos conhecidos (Jo 3:16, Sl 23:1, Gn 1:1).
- Os arquivos gerados são versionados (o texto é CC BY 4.0) e carregados **sob demanda, fora do bundle JS**:
  no web servidos como arquivos estáticos e buscados por `fetch`; no Android empacotados como asset e lidos do
  disco. Mecanismo exato fica com o construtor, desde que a mesma interface `BibleText` (domain) atenda os dois:
  `chapter(book, n): Promise<string[]>`. Cache em memória do livro aberto.
- Livros e capítulos: `packages/domain/src/bible/books.ts` já tem os 66 livros, nomes pt-BR e abreviações; o
  número de versículos por capítulo vem do próprio JSON.

### Traduções (pedido do usuário: alternar entre várias)

- **Embutidas:** só traduções de licença livre e completas (AT+NT). Confirmada: BLIVRE (CC BY 4.0). Candidatas do
  ebible.org a conferir antes de baixar: "Bíblia Livre Para Todos" (`porblt`) e "Bíblia Portuguesa Mundial"
  (`porbrbsl`); entra só a que tiver licença livre verificada. Crédito de cada uma visível.
- **NVI, ARA, ARC e outras com direitos autorais nunca entram no repositório nem no sync** (repo público). O usuário
  pode **importar** um arquivo que possua (USFM, OSIS XML ou JSON no formato do importador) em Bíblia → Traduções:
  o app converte no aparelho e guarda o texto **só localmente** (tabela local-only do SQLite, fora do PowerSync, ou
  armazenamento do aparelho), com nome/sigla dados pelo usuário; pode remover. Cada aparelho importa uma vez.
  O assistente não obtém esses arquivos.
- **Seletor** no topo do leitor e na Bíblia (sigla em `Tag`). A tradução escolhida fica nas preferências locais.
- Grifos e notas são presos à referência OSIS, não à tradução: aparecem em todas. Versificação diferente entre
  traduções: versículo inexistente numa tradução simplesmente não mostra a marcação.
- Interface única `BibleText` com fontes registráveis (embutida / importada): `translations()`, `chapter(tr, book, n)`.
- Offline: no Android o texto embutido vai no APK; no web os arquivos estáticos ficam em cache do navegador após a
  primeira abertura (botão "baixar tudo" no web fica como evolução).

### Grifos (camada do usuário)

Tabela nova `bible_highlights` (migração nova, padrão do AGENTS.md: `vida_apply_standard`, publicação `powersync`,
`sync-streams.yaml`):

| coluna | tipo | regra |
|---|---|---|
| `ref` | text | OSIS de **um versículo** (`JHN.3.16`), validado por `parseOsis` |
| `color` | text | `yellow` · `green` · `blue` · `pink` (check) |
| `style` | text | `highlight` · `underline` (check) |
| `char_start`, `char_end` | int null | reservados para grifo parcial; nulos = versículo inteiro |

- Um grifo ativo por versículo e estilo de versículo inteiro: tocar noutra cor **atualiza** a linha; "remover"
  faz exclusão lógica. Grifar vários versículos selecionados grava tudo ou nada.
- Regras e repositório em `domain/bible` (Zod + contrato de repositório com implementação em memória para testes);
  implementação PowerSync em `features/bible/data`.
- Cores: 4 tokens novos de marca-texto (claro e escuro) em `tokens.ts`, suaves e legíveis nos dois temas.

### Notas ligadas ao versículo

- **Anotar** no menu navega para `/nota/nova` com parâmetros que pré-preenchem a nota: título = referência por
  extenso ("João 3:16") e corpo começando com a citação do versículo e o wikilink, ex.:
  `> [[Jo 3:16]] Porque Deus amou o mundo…` + linha vazia com o cursor. O vínculo nasce pelo caminho que já existe
  (parser de wikilinks → `links` de origem `markdown`), então apagar o `[[…]]` da nota desfaz o vínculo — coerente
  com "nota é nota". A feature `bible` não importa `notes`: só usa a rota.
- **Do versículo para as notas:** o leitor consulta os backlinks do capítulo inteiro de uma vez (alvos `bible` cujo
  ref é um versículo, trecho ou o capítulo) — método novo no `LinksRepository` (ex.: `backlinksInChapter(book, ch)`),
  com a regra de "este ref cobre este versículo" em `domain/bible`. Versículo com nota mostra um marcador discreto
  (ícone + número de notas) no fim do versículo; links para o capítulo inteiro aparecem no menu do capítulo.
- **Da nota para o versículo:** registrar o tipo `bible` no registro de alvos (`TargetSource`/`useOpenTarget`) para
  abrir `/biblia/<LIVRO>/<cap>?v=<verso>`; o leitor rola até o versículo e o destaca brevemente.

### Menu do trecho

- Tocar num versículo seleciona-o (fundo tonal) e abre o menu; tocar em outros versículos com o menu aberto soma à
  seleção (trecho contíguo ou não). Tocar no título do capítulo abre o menu do capítulo.
- Android: `Sheet` (folha) baixa que não cobre o versículo selecionado (o leitor rola se preciso). Web: a mesma folha
  (janela central já é o padrão das folhas no web); popover ancorado fica como evolução.
- Conteúdo: linha das 4 cores + sublinhado + remover (largura fixa, check reservado); "Anotar"; "Notas ligadas"
  (lista com título e trecho, abre a nota); "Copiar" (texto + referência + "BLIVRE").
- **Registro de ações** em `features/bible`: lista de `{ id, label, icon, appliesTo: 'verse' | 'chapter', run(ctx) }`.
  As ações desta etapa se registram ali; a IA registra as suas depois.

### Telas (versão básica; prototipagem fina pendente)

Seguir as fichas do protótipo `docs/prototipos/redesign-cobalto/s-biblia.js`:

1. **Bíblia (início)** — rota `/biblia` já existe: "Continuar" (último capítulo lido, guardado por aparelho nas
  preferências locais), botão de livros, marcações recentes (cor + referência + começo do versículo + nota ligada),
  campo "Ir para…" que já existe, crédito BLIVRE. Estado sem plano do protótipo fica sem a parte de planos.
2. **Folha de livros** — AT e NT, busca por nome, depois grade de capítulos.
3. **Leitor** — `/biblia/[livro]/[cap]`: Literata 19/32, números de versículo discretos, grifos e marcadores de nota,
  barra inferior com capítulo anterior/próximo (atravessa livros). Sem barras extras: modo leitura.
4. **Menu do trecho** — a folha acima.

Também: atalho da Bíblia em "Seus espaços" no Início (hoje recolhido).

## Restrições

AGENTS.md inteiro: tokens, `makeStyles`, `Text`/`Icon`, movimento (`Reveal`, `usePress`, folha 400/240 ms), modo
escuro, 360 dp, pt-BR, regras de importação (bible ↔ notes só via links/rotas), FK composta, migração nova nunca
editada, `pnpm lint && pnpm typecheck && pnpm test` antes de cada commit, commits `feat(biblia): …`.

## Decisões do assistente (corrigíveis)

- Grifo do versículo inteiro nesta etapa; colunas de trecho já no banco.
- Texto em JSON por livro carregado sob demanda (não SQLite embutido): mais simples nos dois alvos; a busca no
  texto (FTS) entra depois com um índice próprio.
- Última posição de leitura só local (por aparelho), sem tabela nova.
- Web usa folha, não popover ancorado.
- **Marcação exclusiva por versículo:** cada versículo tem no máximo uma marcação ativa: marca-texto numa cor ou
  sublinhado (o sublinhado usa a mesma cor escolhida por último, padrão amarelo; a linha das cores vale para os dois).
  "Remover" apaga essa marcação. Sem `unique` no banco (dois aparelhos offline podem criar a mesma): na leitura vence a
  de `updated_at` mais recente e, ao gravar, as cópias recebem `deleted_at` (mesma ideia de `diffMarkdownLinks`).
- **Vários versículos selecionados:** "Anotar" cria **uma** nota; cada bloco contíguo vira um wikilink de trecho
  (`[[Jo 3:16-18]]`) e blocos separados viram wikilinks separados; o título é a primeira referência ("João 3:16-18")
  com "e outros" se houver mais de um bloco; o corpo cita o texto de cada bloco. "Copiar" segue o mesmo agrupamento.
  Grifar aplica a cor a todos os versículos selecionados (tudo ou nada).
- **Versificação:** o texto BLIVRE é a fonte da verdade. O teste do importador compara capítulos por livro com
  `books.ts`; havendo diferença, `books.ts` é corrigido num commit próprio, com os testes de refs ajustados.

## Fica com o construtor

Mecanismo de asset por plataforma, forma exata do método de backlinks por capítulo, layout fino das telas dentro
das fichas do protótipo, divisão de commits.
