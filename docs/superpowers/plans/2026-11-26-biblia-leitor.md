# Bíblia: leitor, grifos, notas ligadas e traduções — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ler a Bíblia offline no Glife, grifar versículos em 4 cores/sublinhado, anotar criando notas comuns ligadas ao versículo (e ver as notas no versículo), alternar entre traduções embutidas e importadas.

**Architecture:** Texto só leitura em JSON por livro, empacotado como asset (Metro) e lido sob demanda; traduções importadas vão para tabelas *local-only* do PowerSync. Grifos numa tabela sincronizada `bible_highlights` (RowStore + repositório no domain). Notas ligam-se pelo caminho de wikilinks que já existe; o leitor lê backlinks do capítulo pela feature `links`.

**Tech Stack:** Expo SDK 58, Expo Router, PowerSync, Zod, vitest, PGlite, expo-asset, expo-file-system, expo-document-picker, expo-clipboard.

**Spec:** `docs/superpowers/specs/2026-11-26-biblia-leitor-design.md`

## Global Constraints

- Tudo do `AGENTS.md`: tokens (`t.colors.highlight.{yellow,green,blue,pink}` já existem; `typeScale.scripture` 19/32 Literata já existe), `makeStyles`, `Text`/`Icon`, movimento, dois temas, 360 dp, pt-BR, sem emoji.
- Fronteiras: `features/bible` não importa `features/notes` (e vice-versa); ligação por rota (`/nota/nova`) e pela feature `links`.
- Texto bíblico nunca é gravado em tabela sincronizada. NVI/ARA/ARC nunca no repositório.
- Crédito visível: "Bíblia Livre (BLIVRE) © 2018 Diego Santos, Mario Sérgio e Marco Teles — CC BY 4.0".
- Antes de cada commit: `pnpm lint && pnpm typecheck && pnpm test`. Commits `feat(biblia): …`, sem co-autoria.
- Migração nova `supabase/migrations/20261128000001_biblia_marcacoes.sql`; nunca editar migração commitada.

## Review Focus

1. Versículo que não existe na tradução aberta (versificação diferente, `?v=` além do fim) → sem marcação/destaque, sem erro.
2. Nota com `[[Jo 3]]` (capítulo) ou `[[Jo 3:16-4:2]]` (trecho que cruza capítulo) → aparece nos versículos/capítulo certos.
3. Dois aparelhos offline grifando o mesmo versículo → a leitura mostra uma só (a mais recente) e a próxima gravação apaga as cópias.
4. Nota ligada que vai para a lixeira → o marcador do versículo some (backlink com `deleted_at`/nota excluída não conta).
5. Arquivo importado malformado ou de outro formato → aviso com o motivo; nada parcial gravado.

---

### Task 1: Texto embutido (importador + BLIVRE)

**Files:**
- Create: `packages/domain/src/bible/usfm.ts`, `packages/domain/src/bible/__tests__/usfm.test.ts`
- Create: `tools/bible-import/import.mjs`, `tools/bible-import/README.md`
- Create (gerados): `apps/app/assets/bible/blivre/<BOOK>.bible` (JSON), `apps/app/src/features/bible/data/bundled/blivre.ts`
- Modify: `apps/app/metro.config.js` (assetExts += `bible`), `packages/domain/src/bible/index.ts`, talvez `packages/domain/src/bible/books.ts`
- Modify: raiz `.gitignore` (`tools/bible-import/downloads/`)

**Interfaces:**
- Produces: `parseUsfm(text: string): { book: string; chapters: string[][] } | null` (livro pelo `\id`; `\c`, `\v`; remove `\f…\f*`, `\x…\x*`, `\w palavra|strong\w*` → palavra, marcas de caractere; ignora `\s`, `\r`, `\d` (títulos de salmo **vão** para a versificação como o USFM definir); colapsa espaços). Formato do JSON: `{ "book": "JHN", "chapters": [["v1", …], …] }`.
- Produces: `bundled/blivre.ts` exporta `BLIVRE: { id: 'blivre'; abbr: 'BLIVRE'; name: 'Bíblia Livre'; credit: string; books: Record<string, number> }` (código → `require('…/<BOOK>.bible')`).

- [ ] **Step 1:** Baixar `https://ebible.org/Scriptures/porbr2018_usfm.zip` para `tools/bible-import/downloads/` (pasta ignorada) e extrair numa pasta própria. Ler as páginas `copyright.htm` de `porblt` e `porbrbsl`: só seguem para o passo 7 se a licença for de domínio público/CC BY/CC BY-SA **e** tiverem AT+NT.
- [ ] **Step 2: teste** `usfm.test.ts`: amostra USFM inline com `\id JHN`, `\c 3`, `\v 16 Porque Deus \w amou|G25\w* o mundo\f + nota\f*`, `\s Título` → `chapters[2][15] === 'Porque Deus amou o mundo'`, sem título; entrada sem `\id` → `null`.
- [ ] **Step 3:** rodar `pnpm --filter @glife/domain test usfm` → FAIL; implementar `parseUsfm`; → PASS.
- [ ] **Step 4:** `import.mjs <pastaUsfm> <id>` (Node, importa `parseUsfm` via `--experimental-strip-types` ou tsx já disponível): grava um `.bible` por livro e gera `bundled/<id>.ts`. Falha (exit 1) se não sair 66 livros, ou se a contagem de capítulos de algum livro divergir de `books.ts` (imprime as diferenças).
- [ ] **Step 5:** rodar para `blivre`; conferir: total de versículos ≈ 31 mil (imprimir), `JHN` 3:16 começa com "Porque Deus", `GEN` 1:1 e `PSA` 23:1 presentes. Se houver divergência de capítulos com `books.ts`, corrigir `books.ts` e `refs.test.ts` num commit `fix(biblia): …` separado.
- [ ] **Step 6:** `metro.config.js`: `config.resolver.assetExts.push('bible')`. Commit `feat(biblia): texto da Bíblia Livre embutido e importador USFM`.
- [ ] **Step 7 (se aprovadas no passo 1):** repetir 4–6 para cada tradução livre extra (`id` minúsculo, sigla e crédito da página de copyright).

### Task 2: Regras de domínio (refs, agrupamento, marcações)

**Files:**
- Create: `packages/domain/src/bible/coverage.ts`, `packages/domain/src/bible/highlights.ts`, `packages/domain/src/bible/repository.ts`
- Create: `packages/domain/src/bible/__tests__/coverage.test.ts`, `packages/domain/src/testing/bibleContract.ts` (+ export em `testing/index.ts`), `packages/domain/src/bible/__tests__/highlights.test.ts`
- Modify: `packages/domain/src/bible/index.ts`

**Interfaces:**
- Produces (`coverage.ts`):
  - `refCoversVerse(ref: BibleRef, book: string, chapter: number, verse: number): boolean` — capítulo (`JHN.3`) cobre todos; trecho cruzando capítulo cobre do início ao fim.
  - `refTouchesChapter(ref: BibleRef, book: string, chapter: number): boolean`
  - `groupVerses(book: string, chapter: number, verses: readonly number[]): BibleRef[]` — ordena, tira repetidos, junta contíguos em trechos.
  - `annotationDraft(blocks: readonly { ref: BibleRef; text: string }[]): { title: string; body: string }` — título `formatRef(blocks[0].ref, 'name')` + `" e outros"` se >1 bloco; corpo: por bloco `> [[<formatRef abbr>]] <texto>` separados por linha vazia, terminando em `\n\n`.
  - `copyText(blocks, translationAbbr: string): string` — `"<texto>" — <formatRef name> (<SIGLA>)`, blocos separados por linha vazia.
- Produces (`highlights.ts`): `HIGHLIGHT_COLORS = ['yellow','green','blue','pink'] as const`, `HIGHLIGHT_STYLES = ['highlight','underline'] as const`, `type BibleHighlight = BaseEntity & { ref: string; color; style; char_start: number | null; char_end: number | null }`, `newHighlight(input: { ref: string; color; style }, userId, clock?)` (ref precisa ser OSIS de **um versículo**: `parseOsis` com `verse` e sem fim).
- Produces (`repository.ts`): `type BibleRows = { bible_highlights: BibleHighlight }`, `BIBLE_TABLES`, e
  ```ts
  interface BibleHighlightsRepository {
    list(): Promise<BibleHighlight[]>;                 // uma por versículo (a de updated_at mais recente)
    watch(listener: Listener<BibleHighlight[]>, onError?: ErrorListener): Unsubscribe;
    set(refs: readonly string[], mark: { color: HighlightColor; style: HighlightStyle }): Promise<void>; // tudo ou nada; atualiza existente, apaga cópias
    clear(refs: readonly string[]): Promise<void>;     // deleted_at em todas as linhas vivas desses refs
  }
  createBibleHighlightsRepository(store: RowStore<BibleRows>, userId: string, clock?: () => Date)
  ```
- [ ] **Step 1: testes** `coverage.test.ts`: `JHN.3` cobre 3:1 e 3:36; `JHN.3.16-4.2` cobre 3:36 e 4:1, não 4:3; `groupVerses('JHN',3,[18,16,17,20])` → `JHN.3.16-18`, `JHN.3.20`; `annotationDraft` de dois blocos → título `"João 3:16-18 e outros"`, corpo começa com `> [[Jo 3:16-18]] `; `copyText` termina com `— João 3:16 (BLIVRE)`.
- [ ] **Step 2: contrato** `bibleContract.ts` (padrão dos outros `*Contract.ts`, rodado com `rowStoreMemory`): set em 2 refs cria 2; set de novo com outra cor atualiza (continua 2, `updated_at` novo); duas linhas vivas do mesmo ref inseridas direto no store → `list()` devolve a mais recente e `set` seguinte deixa só uma viva; ref inválido (`JHN.3`, `JHN.3.16-18`, `XXX.1.1`) → `validation` e nada gravado; `clear` remove.
- [ ] **Step 3:** FAIL → implementar → PASS (`pnpm --filter @glife/domain test bible`). Commit `feat(biblia): regras de referência, anotação e marcações`.

### Task 3: Banco e sync das marcações

**Files:**
- Create: `supabase/migrations/20261128000001_biblia_marcacoes.sql`
- Modify: `supabase/powersync/sync-streams.yaml`, publicação `powersync` na migração
- Create: `apps/app/src/features/bible/data/schema.ts` (`bibleTables`, `bibleTableLabels`)
- Modify: `apps/app/src/app/_layout.tsx` (spread em `createLocalSync` e `syncLabels`), teste de schema local existente (`tests/localSchema.test.ts` ou equivalente) e o teste de banco PGlite que lista tabelas, se houver.

**Interfaces:** tabela `public.bible_highlights(id, user_id, ref text check (ref ~ '^[1-3]?[A-Z]{2,3}\.[0-9]{1,3}\.[0-9]{1,3}$'), color text check in (...), style text check in ('highlight','underline'), char_start int, char_end int check (char_start is null) = (char_end is null) and char_end >= char_start, created_at, updated_at, deleted_at)` + `vida_apply_standard` + índice `(user_id, ref)`; **sem unique em ref**. Rótulo de sync: `{ noun: 'Marcação da Bíblia', gender: 'f' }`.

- [ ] **Step 1:** teste PGlite (padrão das migrações anteriores): outro usuário não lê/escreve; cor inválida rejeitada; ref `JHN.3` rejeitado.
- [ ] **Step 2:** escrever a migração e o stream `SELECT * FROM bible_highlights WHERE user_id = auth.user_id() AND auth.parameter('aal') = 'aal2'`; `pnpm test` → PASS.
- [ ] **Step 3:** `schema.ts` + `_layout.tsx`; teste de schema local passa. Commit `feat(biblia): tabela de marcações com RLS e sync`. Registrar em `PENDENCIAS.md`: `pnpm sb db push --remote` e republicar o sync-streams.

### Task 4: Links — backlinks do capítulo e abrir versículo

**Files:**
- Modify: `packages/domain/src/links/repository.ts`, `packages/domain/src/testing/linksContract.ts`, `apps/app/src/features/links/data/localLinksRepository.ts`
- Modify: `apps/app/src/features/links/data/targets.ts`, `apps/app/src/features/links/hooks/Targets.tsx`, `apps/app/src/features/links/index.ts`
- Modify: `apps/app/src/features/notes/screens/NoteEditorScreen.tsx` (`openWikilink`), `apps/app/src/features/notes/components/NoteLinks.tsx` (linha bíblica abre e mostra `formatRef(…,'name')`)

**Interfaces:**
- Produces: `LinksRepository.watchBibleBook(book: string, listener: Listener<Link[]>, onError?): Unsubscribe` — links vivos com `target_type='bible'` e `target_ref` começando por `<BOOK>.` cuja **origem está viva** (para notas: `JOIN notes` com `deleted_at IS NULL`; o filtro fica no SQL local; na memória do contrato, via função de "origem viva" injetada). O leitor filtra por capítulo com `refTouchesChapter`/`refCoversVerse`.
- Produces: `useOpenAddress(): (type: EntityType, ref: string) => Promise<void>` em `links` — para `bible` usa um `AddressRoute` registrado (`{ type: 'bible', href(ref): string | null }`) passado ao `TargetsProvider` como `routes`; para os outros tipos cai em `useOpenTarget`.
- Produces: `bibleHref(osis: string): string | null` em `features/bible` → `/biblia/<BOOK>/<cap>?v=<verso>` (sem `v` se for capítulo).

- [ ] **Step 1:** contrato de links: link de nota para `JHN.3.16` e `JHN.3` aparecem em `watchBibleBook('JHN')`; `ROM.8.28` não; origem excluída não aparece. FAIL → implementar memória e local → PASS.
- [ ] **Step 2:** `openWikilink(target)`: se `findIdByTitle` não achar e `parseBibleRef(target)` achar, `openAddress('bible', toOsis(ref))`. `NoteLinks`: linha bíblica com rótulo por extenso e ação de abrir. Teste do componente/hook existente ajustado.
- [ ] **Step 3:** commit `feat(links): backlinks por livro da Bíblia e abrir versículo a partir da nota`.

### Task 5: Nova nota a partir do versículo

**Files:** Modify `apps/app/src/features/notes/screens/NewNoteScreen.tsx` (+ teste)

**Interfaces:** `/nota/nova?titulo=…&corpo=…` — `corpo` limitado a `NOTE_BODY_MAX`; após `notes.create({ title, body_md })`, chama `syncNoteLinks({ notes, links }, n.id, body)` antes do `router.replace`. Se o sync falhar, a nota vai para a lixeira (`notes.remove`) e volta com aviso "Não deu para ligar a nota ao versículo: <motivo>" (tudo ou nada).

- [ ] **Step 1:** teste: com `corpo` contendo `[[Jo 3:16]]`, cria a nota e o link `bible/JHN.3.16`; sem `corpo`, comportamento atual. FAIL → implementar → PASS. Commit `feat(notas): nova nota pode nascer com texto e vínculos`.

### Task 6: Dados da Bíblia no app

**Files:**
- Create: `apps/app/src/features/bible/data/bundledText.ts`, `data/localHighlights.ts`, `data/readingPrefs.ts`, `hooks/BibleData.tsx`, `__tests__/readingPrefs.test.ts`
- Modify: `apps/app/src/features/bible/index.ts`, `apps/app/src/app/_layout.tsx` (provider)
- Install: `cd apps/app && npx expo install expo-asset expo-file-system expo-document-picker`

**Interfaces:**
- Domain (`packages/domain/src/bible/text.ts`): `interface Translation { id: string; abbr: string; name: string; credit: string | null; source: 'bundled' | 'imported' }`, `interface BibleTextSource { translations(): Promise<Translation[]>; chapter(translationId: string, book: string, chapter: number): Promise<string[] | null> }`, `combineSources(...s: BibleTextSource[]): BibleTextSource`.
- `bundledText.ts`: `createBundledText(list: BundledTranslation[]): BibleTextSource` — `Asset.fromModule(mod)`; web: `fetch(asset.uri).json()`; nativo: `downloadAsync()` + leitura do `localUri` (expo-file-system `File`). Cache de **um** livro por tradução em memória.
- `readingPrefs.ts` (padrão `seenStore`, `KeyValueStorage`): `load(): Promise<{ translationId: string; last: { book: string; chapter: number } | null }>`, `save(p)`; valida o que lê (livro existe, capítulo dentro de `books.ts`), padrão `blivre`.
- `BibleData.tsx`: `BibleProvider({ db, userId, storage })` expõe `useBible(): { text: BibleTextSource; highlights: BibleHighlightsRepository; prefs: ReadingPrefsStore }`.

- [ ] **Step 1:** testes de `readingPrefs` (valor corrompido → padrão) e de `combineSources` (domain). FAIL → implementar → PASS. Commit `feat(biblia): fontes do texto, marcações e preferências de leitura no app`.

### Task 7: Leitor e menu do trecho

**Files:**
- Create: `apps/app/src/app/biblia/[livro]/[cap].tsx` (fina), `features/bible/screens/ReaderScreen.tsx`, `components/VerseText.tsx`, `components/PassageSheet.tsx`, `components/actions.ts`, `hooks/useChapter.ts`, `hooks/useChapterLinks.ts`, `__tests__/actions.test.ts`
- Modify: `_layout.tsx` (Stack.Screen `biblia/[livro]/[cap]`), registro de rotas do links (`routes: [{ type: 'bible', href: bibleHref }]`)

**Interfaces:**
- `actions.ts`: `interface PassageAction { id: string; label: string; icon: LucideIcon; appliesTo: 'verse' | 'chapter' | 'both'; run(ctx: PassageContext): Promise<void> | void }`, `interface PassageContext { translation: Translation; book: string; chapter: number; verses: number[]; texts: Record<number, string>; close(): void }`, `registerPassageAction(a)`, `passageActions(kind)`. Ações desta etapa: `annotate` (router.push `/nota/nova` com `annotationDraft`), `copy` (expo-clipboard + toast "Copiado"). Grifo e "Notas ligadas" são seções fixas da folha, não ações.
- Leitor: Literata `scripture`; número do versículo em `micro` tom terciário; grifo = fundo `t.colors.highlight[color]` com raio pequeno; sublinhado = `textDecorationLine` com cor do token; marcador de notas = ícone `NotebookPen` `tiny` + contagem, tocável (abre a folha já na lista de notas). Selecionado = fundo `t.colors.highlightSoft`. `?v=` rola até o versículo e pisca a seleção 1×; inexistente → abre no topo. Barra inferior: anterior/próximo (atravessa livros; some no Gn 1 / Ap 22), sigla da tradução (abre seletor, Task 9). Título do capítulo tocável → folha do capítulo. Rodapé com crédito da tradução.
- `PassageSheet`: título = refs agrupadas; linha de 4 cores + sublinhado + remover (botões de tamanho fixo; check com opacidade); "Anotar"; "Copiar"; ações registradas extras; "Notas ligadas" (título da nota via `useResolve…`/fonte de busca de notas do `links`, toque abre pelo `useOpenTarget('note', id)`). Grifar aplica `highlights.set(verses→OSIS, mark)`; erro mostra o motivo.

- [ ] **Step 1:** testes `actions.test.ts` (registro, filtro por `appliesTo`) e de `useChapterLinks` como função pura `linksByVerse(links, book, chapter, verseCount): { byVerse: Map<number, Link[]>; chapter: Link[] }` (Review Focus 2). FAIL → implementar → PASS.
- [ ] **Step 2:** telas; `pnpm web`, abrir `/biblia/JHN/3?v=16` no Chrome (navegador embutido não abre o banco), grifar, anotar, voltar, ver marcador; dois temas; 360 dp. Commit `feat(biblia): leitor com grifos, anotação e notas ligadas`.

### Task 8: Início da Bíblia e livros

**Files:** Modify `features/bible/screens/BibleHomeScreen.tsx`; Create `components/BooksSheet.tsx`; Modify `features/today/screens/TodayScreen.tsx` (atalho Bíblia em "Seus espaços"), `features/bible/index.ts`

- Início: `Tag` da tradução (abre seletor), cartão "Continuar" (prefs `last`, senão "Começar em Gênesis 1"), botão Livros, "Ir para…" existente agora navega (`bibleHref`), "Marcações recentes" (`ListGroup`, 6 mais recentes: barra da cor + referência + começo do versículo), crédito.
- `BooksSheet`: segmentado AT/NT, busca por nome/abreviação (`findBook`), depois grade de capítulos (botões de tamanho fixo).
- [ ] **Step 1:** teste puro de "marcações recentes" (ordena por `updated_at`, limita 6). Implementar; conferir no Chrome. Commit `feat(biblia): início da Bíblia, livros e atalho no Início`.

### Task 9: Traduções importadas e seletor

**Files:**
- Create: `features/bible/data/importedText.ts`, `data/importTranslation.ts`, `screens/TranslationsScreen.tsx`, `components/TranslationSheet.tsx`, `apps/app/src/app/biblia/traducoes.tsx`, `__tests__/importTranslation.test.ts`
- Modify: `data/schema.ts` (tabelas locais), `_layout.tsx`

**Interfaces:**
- Tabelas PowerSync `localOnly: true`: `bible_local_translations(abbr, name, created_at)`, `bible_local_verses(translation_id, book, chapter, verse, text)` com índice `(translation_id, book, chapter)`. Não entram em `syncLabels`.
- `importTranslation(db, files: { name: string; text: string }[], meta: { abbr: string; name: string }): Promise<Translation>` — aceita vários `.usfm/.sfm` (via `parseUsfm`) **ou** um `.json` no formato do importador (`{ books: [{ book, chapters }] }`, validado por Zod); exige ≥ 1 livro reconhecido, sigla 2–8 letras única; grava tudo numa transação (falhou → nada fica). Erros: `RepositoryError('validation')` com motivo legível ("Nenhum livro reconhecido nos arquivos", "Sigla já usada").
- `importedText.ts`: `createImportedText(db): BibleTextSource`; `removeTranslation(db, id)`.
- Tela Traduções (Ajustes da Bíblia): lista (embutidas com crédito; importadas com remover + `Dialog`), "Importar tradução" (document picker, múltiplos arquivos, campos sigla e nome em `Sheet`), aviso fixo: "Fica só neste aparelho. Use apenas traduções que você tem direito de usar." `TranslationSheet`: escolha rápida no leitor/início; salva em prefs.
- [ ] **Step 1:** testes de `importTranslation` com banco local de teste (padrão dos testes de `data/`): USFM válido → tradução + versículos; JSON inválido → `validation` e zero linhas; sigla repetida → `validation`. FAIL → implementar → PASS.
- [ ] **Step 2:** telas; conferir import no Chrome com um USFM de amostra criado à mão. Commit `feat(biblia): importar tradução só no aparelho e alternar traduções`.

### Task 10: Fechamento

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build:web` verdes; conferência no Chrome (dois temas, 360 dp) das Tasks 7–9 com print enviado ao usuário.
- [ ] `docs/PLANO_DE_IMPLEMENTACAO.md` (Fase 4: o que foi feito, o que ficou), `PENDENCIAS.md` (db push, sync-streams, APK com `prebuild --clean` por libs nativas novas), `STATUS.md`. Commit `docs(biblia): fechamento da primeira etapa da Fase 4`.
