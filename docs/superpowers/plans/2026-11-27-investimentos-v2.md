# Investimentos v2 (Opção A, Painel) — plano de implementação

> **Para agentes:** use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans, tarefa
> por tarefa. Passos com checkbox (`- [ ]`).

**Objetivo:** levar ao app a Opção A do protótipo: painel com gráficos de toque, alocação com metas, ranking da
carteira e do mercado, estatísticas por ativo, leitura dos números e busca de ativo com sugestões, só com dados grátis.

**Arquitetura:** regras puras no `packages/domain` (`quotes/` ganha histórico, mercado e busca; `finance/` ganha
grupos, metas, séries diárias, estatísticas e leituras); a Edge Function `quotes` ganha as ações `history`, `market`
e `search` com cache em `private`; telas em `features/finance` com gráficos em `react-native-svg` + Reanimated +
gesture-handler (já instalados: svg 15.16, Reanimated 4.7.1, gesture-handler ~3.3).

**Stack:** TypeScript, Zod 4, Vitest, PGlite, Expo Router (SDK 58), PowerSync, Supabase Edge Functions (Deno).

**Spec:** `docs/superpowers/specs/2026-11-27-investimentos-v2-design.md` (leia junto). Protótipo aprovado (Opção A):
`docs/prototipos/investimentos-v2/index.html`. Base anterior: `docs/superpowers/specs/2026-11-25-investimentos-design.md`.

**Branch:** `investimentos-v2` na worktree `../glife-investimentos-v2`. A pasta `glife/` é da sessão da IA
(`fase-6-ia`): não mexer lá.

## Restrições globais

- Regras do `AGENTS.md` em tudo: tokens (nada de hex/número solto), `Input`/`MoneyField` com teclado do aparelho,
  360 dp, dois temas, "reduzir movimento", Lucide 1,5, textos pt-BR, sem gradiente.
- Dinheiro em centavos; quantidade × 10⁸; preço em R$ × 10⁸ (`priceE8`, `close_e8`). Produtos em `BigInt` (`unitsValue`).
- `packages/domain` sem React/Expo/Supabase/PowerSync; imports relativos com `.ts`.
- Só dados grátis: brapi (1 ticker por pedido, histórico `range=3mo`, `/api/quote/list` sem token) e CoinGecko Demo
  (`market_chart` até 365 dias, `/coins/markets`, `/search`). Nada de dividend yield, P/L, screener nem CDI.
- Toda estatística carrega a janela usada; com menos de **20 pregões** ela não aparece.
- Leituras sempre terminam com: "Análise com dados do período. Não é recomendação de compra ou venda."
- Ranking B3: exclui `type: 'bdr'` e papéis com `volume` < **100.000** (decisão do plano para tirar papéis sem
  negócio); máximo de 10 linhas.
- Cache no servidor: lista de mercado 30 min (`QUOTE_TTL_MS`); catálogo de busca 24 h; histórico: no máximo uma ida
  ao provedor por símbolo por dia.
- Botão "Perguntar à Glife IA" **não** entra nesta branch; nada muda em `links` além do `create` com texto (Tarefa 11).
- Antes de cada commit: `pnpm lint && pnpm typecheck && pnpm test`. Commits `tipo(área): descrição`, sem co-autoria.
  Migração commitada não se edita.

## Foco da revisão

1. Ativo com 1 a 19 pregões de histórico (comprado ontem, cripto nova): estatísticas somem com "Ainda sem dados
   suficientes", gráfico mostra só os pontos que há — teste na Tarefa 6.
2. brapi devolve 403/400 no `range=3mo` ou a `/quote/list` some: `history` usa só o histórico acumulado, o ranking B3
   some da tela e a busca cai no `lookup` por código exato — testes nas Tarefas 1 e 3.
3. Metas que não somam 100 ou grupo sem ativo: não salva e mostra a soma atual; rosca "Meta" mostra o grupo com 0%
   atual — testes nas Tarefas 4 e 9.
4. Carteira só com ativos manuais (sem preço diário): série usa os movimentos, sem buraco nem zero falso — teste na
   Tarefa 5.
5. Busca com acento, minúscula e parte do nome ("logis", "itaú", "btc"): mesmos resultados de "LOGIS", "itau",
   "BTC"; menos de 2 letras não busca — testes nas Tarefas 1 e 12.

---

### Tarefa 1: Histórico, mercado e busca no domain de cotações

**Arquivos:** modificar `packages/domain/src/quotes/{model,brapi,coingecko,service,index}.ts`; criar
`packages/domain/src/quotes/catalog.ts`; testes em `packages/domain/src/quotes/__tests__/{brapi,coingecko,service,catalog}.test.ts`.

**Produz:**
```ts
export interface PricePoint { date: string /*YYYY-MM-DD*/; closeE8: number }
export type MarketType = 'stock' | 'reit' | 'crypto';
export interface MarketItem { source: QuoteSource; symbol: string; ticker: string; name: string; type: MarketType;
  priceE8: number; changeDay: number /*% do dia*/; change30d: number | null; change1y: number | null; volume: number | null }
export const MARKET_SORTS = ['up_day', 'down_day', 'volume', 'up_30d', 'up_1y'] as const; export type MarketSort = …;
export const SEARCH_MIN = 2; export const MARKET_MIN_VOLUME = 100_000; export const MARKET_LIMIT = 10;
// QuoteProvider ganha:
history(symbol: string): Promise<PricePoint[]>;        // [] em 400/403/404/falha
market(): Promise<MarketItem[]>;                       // [] se a fonte falhar
export function searchCatalog(items: readonly MarketItem[], q: string, limit?: number /*8*/): MarketItem[];
export function rankMarket(items: readonly MarketItem[], sort: MarketSort, type?: MarketType): MarketItem[];
export interface PriceHistoryStore { get(key: QuoteKey): Promise<PricePoint[]>; put(key: QuoteKey, points: readonly PricePoint[]): Promise<void>; fetchedToday(key: QuoteKey, today: string): Promise<boolean> }
export interface MarketListCache { get(list: QuoteSource): Promise<{ items: MarketItem[]; fetchedAt: string } | null>; put(list: QuoteSource, items: readonly MarketItem[]): Promise<void> }
// QuoteService: construtor ganha { history: PriceHistoryStore; lists: MarketListCache }; métodos novos:
history(key: QuoteKey): Promise<PricePoint[]>; market(source: QuoteSource, sort: MarketSort, type?: MarketType): Promise<MarketItem[]>;
search(q: string): Promise<MarketItem[]>;
// quoteRequestSchema ganha: { action:'history', item: QuoteKey } | { action:'market', source, sort, type? } | { action:'search', query (2..40) }
```

- [ ] **Teste (brapi.history):** chama `https://brapi.dev/api/quote/ITSA4?range=3mo&interval=1d&token=T`; mapeia
  `results[0].historicalDataPrice[{ date: <segundos>, close }]` para `{ date: 'YYYY-MM-DD' (America/Sao_Paulo), closeE8 }`
  em ordem crescente, ignorando `close` nulo; 403 → `[]`.
- [ ] **Teste (brapi.market):** chama `https://brapi.dev/api/quote/list?limit=2000` (sem token); `type:'stock'` →
  `stock`, `type:'fund'` com `subType:'fii'` → `reit`, BDR e outros fundos descartados; `change` vira `changeDay`;
  falha → `[]`.
- [ ] **Teste (coingecko.history/market):** `…/coins/bitcoin/market_chart?vs_currency=brl&days=365&interval=daily`
  → um ponto por dia (último do dia); `…/coins/markets?vs_currency=brl&order=market_cap_desc&per_page=100&price_change_percentage=24h,30d,1y`
  → `type:'crypto'`, `ticker` maiúsculo, `change30d`/`change1y` preenchidos.
- [ ] **Teste (catalog):** `searchCatalog(items,'logis')` acha `HGLG11` e `BTLG11` (nome com "Logística");
  `'itau'` acha "Itaú"; `'btc'` acha Bitcoin pelo ticker; ordem: ticker começa com > nome começa com > palavra começa
  com > contém; `'l'` (1 letra) → `[]`. `rankMarket(items,'up_day','stock')` exclui volume < 100.000 e devolve ≤ 10.
- [ ] **Teste (service):** `history` com `fetchedToday=true` não chama o provedor e devolve o armazenado; com `false`
  busca, faz `put` e devolve a união sem datas repetidas (o armazenado vence o provedor na mesma data). `market` usa
  o cache se < 30 min. `search` usa o catálogo de até 24 h; sem catálogo B3 cai em `lookup` por código exato.
  `getQuotes` passa a gravar o preço do dia em `history.put` (um ponto com a data de `quotedAt`).
- [ ] Rodar `pnpm --filter @glife/domain test quotes` → falha; implementar; → passa.
- [ ] Commit `feat(investimentos): histórico, mercado e busca no domain de cotações`.

### Tarefa 2: Migração (metas, histórico diário e listas de mercado)

**Arquivos:** criar `supabase/migrations/20261202000001_investimentos_v2.sql`; modificar
`supabase/powersync/sync-streams.yaml`, `apps/app/src/features/finance/data/schema.ts`; testes em
`supabase/tests/investmentsV2.test.ts` e `apps/app/tests/localSchema.test.ts`.

**Produz (SQL):**
- `public.investment_targets` — **uma linha por usuário, `id = user_id`** (mesmo padrão de `diet_goals`; decisão do
  plano no lugar de uma linha por grupo): `fixed_income`, `stocks`, `reits`, `funds`, `crypto`, `other` (`smallint`
  0–100, default 0), check `fixed_income+stocks+reits+funds+crypto+other = 100`; `vida_apply_standard`; publicação
  `powersync`; stream `SELECT * FROM investment_targets WHERE user_id = auth.user_id() AND auth.parameter('aal') = 'aal2'`.
- `private.market_prices_daily (source text, symbol text, date date, close_e8 bigint > 0, primary key (source, symbol, date))`
  e `private.market_history_fetch (source, symbol, fetched_on date, pk (source, symbol))`.
- `private.market_lists (list text primary key check (list in ('brapi','coingecko')), payload jsonb, fetched_at timestamptz)`.
- Funções `public.market_prices_get(key jsonb)`, `market_prices_put(key jsonb, points jsonb)`,
  `market_history_fetched(key jsonb, today date) returns boolean`, `market_lists_get(list text)`,
  `market_lists_put(list text, payload jsonb)`: `security definer`, `set search_path = ''`, `revoke execute … from
  public, anon, authenticated`, `grant execute … to service_role` (como `market_quotes_*`).

- [ ] **Teste (banco):** usuário com aal2 lê/grava só a própria meta; soma ≠ 100 é recusada; `authenticated` não
  executa `market_prices_get`/`market_lists_get` (erro de permissão); `service_role` grava e lê; `put` repetido na
  mesma data substitui o preço (upsert).
- [ ] **Teste (schema local):** `investment_targets` existe no schema do PowerSync com as 6 colunas.
- [ ] Rodar `pnpm test` → falha; implementar; → passa (o PGlite aplica todas as migrações).
- [ ] Commit `feat(investimentos): migração de metas, histórico diário e listas de mercado`.

### Tarefa 3: Edge Function `quotes` com `history`, `market` e `search`

**Arquivos:** modificar `supabase/functions/quotes/{handler,cache,index}.ts`; criar
`supabase/functions/quotes/history.ts` (`PriceHistoryStore` e `MarketListCache` sobre as RPCs da Tarefa 2); teste em
`supabase/functions/quotes/handler.test.ts` (ou onde ficam os testes atuais da função).

**Consome:** Tarefas 1 e 2. **Produz:** respostas `{ points: PricePoint[] }`, `{ items: MarketItem[] }`,
`{ items: MarketItem[] }`.

- [ ] **Teste:** sem aal2 → 401/403 (como hoje); `history` com símbolo inválido → 400; `market` com `sort` fora de
  `MARKET_SORTS` → 400; serviço lançando → 502 "Cotação indisponível agora."; RPC de cache falhando não derruba a
  resposta (vem do provedor).
- [ ] Implementar; `deno check --config supabase/functions/deno.json supabase/functions/quotes/index.ts` → sem erro.
- [ ] Commit `feat(investimentos): função quotes com histórico, mercado e busca`.

### Tarefa 4: Grupos de alocação e metas no domain e no repositório

**Arquivos:** criar `packages/domain/src/finance/allocation.ts`; modificar
`packages/domain/src/finance/{investmentsRepository,index}.ts`, `packages/domain/src/testing/financeMemory.ts`,
`apps/app/src/features/finance/data/localFinanceStore.ts`; teste `packages/domain/src/finance/__tests__/allocation.test.ts`.

**Produz:**
```ts
export const ALLOCATION_GROUPS = ['fixed_income', 'stocks', 'reits', 'funds', 'crypto', 'other'] as const; export type AllocationGroup = …;
export const ALLOCATION_LABELS: Record<AllocationGroup, string>; // Renda fixa, Ações, FIIs, Fundos, Cripto, Outros
export function groupOf(kind: AssetKind): AllocationGroup; // fixed_income|treasury|savings → fixed_income …
export type Targets = Record<AllocationGroup, number>; // inteiros, soma 100
export const targetsSchema; export function targetsSum(t: Partial<Targets>): number;
export interface AllocationSlice { group: AllocationGroup; total: number; share: number /*0–1*/; target: number | null /*0–1*/; diff: number | null /*pontos*/ }
export function allocation(p: Portfolio, targets: Targets | null): AllocationSlice[]; // ordem fixa de ALLOCATION_GROUPS
export function contributionToReach(p: Portfolio, targets: Targets): Partial<Record<AllocationGroup, number>>; // centavos só com aportes
// InvestmentsRepository ganha: getTargets(): Promise<Targets | null>; setTargets(t: Targets): Promise<Targets>;
// InvestmentsSnapshot ganha: targets: Targets | null
```

- [ ] **Teste:** `groupOf('treasury') === 'fixed_income'`; `allocation` com carteira R$ 600 RF / R$ 400 cripto e
  metas 50/…/10 → RF `share .6, diff +10`, cripto `share .4, diff +30`, grupo sem ativo com meta 15 → `share 0,
  diff −15`; `targets null` → `target`/`diff` nulos; `setTargets` com soma 99 lança erro "As metas precisam somar
  100%"; `contributionToReach` com cripto acima da meta devolve aportes só nos grupos abaixo e soma total exata.
- [ ] Rodar → falha; implementar (repositório segue `diet_goals`: `id = userId`, `put` em transação); → passa.
- [ ] Commit `feat(investimentos): grupos de alocação e metas`.

### Tarefa 5: Séries diárias (ativo e carteira)

**Arquivos:** criar `packages/domain/src/finance/investmentSeries.ts`; teste `__tests__/investmentSeries.test.ts`.

**Produz:**
```ts
export type PriceBook = ReadonlyMap<string /*asset_id*/, readonly PricePoint[]>;
export interface DailyPoint { date: IsoDate; value: number /*centavos*/; invested: number }
export function assetDaily(asset: InvestmentAsset, movements: readonly InvestmentMovement[], prices: readonly PricePoint[], today: IsoDate): DailyPoint[];
export function portfolioDaily(p: Portfolio, movements: readonly InvestmentMovement[], book: PriceBook, today: IsoDate): DailyPoint[];
export const PERIOD_DAYS = { '1M': 31, '6M': 183, '1A': 366, 'Tudo': Infinity } as const; export type Period = keyof typeof PERIOD_DAYS;
export function slicePeriod<T extends { date: IsoDate }>(s: readonly T[], period: Period, today: IsoDate): T[];
```
Regra: um ponto por dia corrido desde o primeiro movimento; automático = cotas do dia × preço diário (sem preço no
dia: último preço conhecido; antes do primeiro preço: preço pago no aporte); manual = valor após movimentos,
interpolado linearmente entre pontos de `quote`/movimento; `invested` = Σ aportes − Σ resgates até o dia.

- [ ] **Teste:** aporte de 10 cotas a R$ 10 em 01/09 + preços 02/09 = 11 e 04/09 = 12 → 03/09 vale R$ 110 (repete o
  último); carteira só manual (aporte R$ 1.000 em 01/09, cotação R$ 1.100 em 11/09) → 06/09 = R$ 1.050; último ponto
  = `portfolio().total`; `slicePeriod('1M')` corta no dia certo; série vazia sem movimentos.
- [ ] Rodar → falha; implementar; → passa. Commit `feat(investimentos): séries diárias de ativo e carteira`.

### Tarefa 6: Estatísticas por ativo

**Arquivos:** criar `packages/domain/src/finance/investmentStats.ts`; teste `__tests__/investmentStats.test.ts`.

**Produz:**
```ts
export const STATS_MIN_POINTS = 20;
export interface StatWindow { from: IsoDate; to: IsoDate; days: number }
export interface AssetStats {
  window: StatWindow | null; // null = dados insuficientes
  periodReturn: number | null;   // fração na janela
  volatility: number | null;     // desvio-padrão dos retornos diários × √252
  maxDrawdown: number | null;    // fração negativa (topo→fundo) na janela
  vsAverage: number | null;      // preço/preço médio − 1 (só automático)
  income12m: number;             // centavos de `income` nos últimos 365 dias
  yieldOnCost: number | null;    // income12m / investido
  oscillation: 'low' | 'medium' | 'high' | null; // < 10%, < 25%, ≥ 25% a.a.
}
export function assetStats(asset: InvestmentAsset, position: AssetPosition, movements: readonly InvestmentMovement[], prices: readonly PricePoint[], today: IsoDate): AssetStats;
```

- [ ] **Teste:** 19 pontos → `window null` e números nulos (income ainda calculado); série 100→120→90→110 →
  `maxDrawdown −0,25`, `periodReturn 0,10`; série constante → `volatility 0`, `oscillation 'low'`; preço 38,95 com
  médio 41,80 → `vsAverage ≈ −0,0682`; ativo manual → `vsAverage null`.
- [ ] Rodar → falha; implementar; → passa. Commit `feat(investimentos): estatísticas por ativo`.

### Tarefa 7: Leitura dos números e ranking da carteira

**Arquivos:** criar `packages/domain/src/finance/insights.ts`; teste `__tests__/insights.test.ts`.

**Produz:**
```ts
export type InsightBlock =
  | { kind: 'text'; text: string } | { kind: 'heading'; text: string }
  | { kind: 'list'; tone: 'ok' | 'warn'; items: string[] }
  | { kind: 'numbers'; items: { label: string; value: string; tone?: 'ok' | 'bad' }[] }
  | { kind: 'range'; low: number; mid: number; high: number; caption: string }
  | { kind: 'allocation'; before: Record<AllocationGroup, number>; after?: Record<AllocationGroup, number>; targets?: Targets; focus?: AllocationGroup }
  | { kind: 'disclaimer'; text: string };
export const INSIGHT_DISCLAIMER = 'Análise com dados do período. Não é recomendação de compra ou venda.';
export const ASSET_QUESTIONS = [['desde','Quanto rendeu desde que comprei?'],['aporte','Vale a pena aportar mais?'],['historico','O que o passado mostra?'],['riscos','Quais os riscos?']] as const;
export const PORTFOLIO_QUESTIONS = [['carteira','Como está minha carteira?'],['melhor','O que mais rendeu?'],['concentracao','Estou concentrado em algo?']] as const;
export function assetInsight(q: AssetQuestion, ctx: { asset: InvestmentAsset; position: AssetPosition; stats: AssetStats; portfolio: Portfolio; targets: Targets | null; movements: readonly InvestmentMovement[]; priceE8: number | null; money: (c: number) => string }): InsightBlock[];
export function portfolioInsight(q: PortfolioQuestion, ctx: { portfolio: Portfolio; targets: Targets | null; money: (c: number) => string }): InsightBlock[];
export function portfolioHeadline(p: Portfolio, targets: Targets | null): string | null; // cartão "Leitura": maior grupo > meta + 3 p.p.
export function rankBySinceBuy(p: Portfolio): { asset: InvestmentAsset; pct: number; result: number }[]; // desc
```
Textos-base no protótipo (`aiAsset`/`aiPort` em `index.html`), trocando CDI e "desde 2016" por dados próprios:
toda frase com número de mercado cita a janela ("nos últimos 3 meses"). `aporte` simula **R$ 1.000** (novo preço
médio e efeito na meta); `historico` usa `periodReturn ± volatility` da janela com a frase "Passado não garante o
futuro". Nenhuma frase contém "compre", "venda" ou "recomendo".

- [ ] **Teste:** toda saída termina com `disclaimer`; `aporte` em ativo abaixo do preço médio traz item "a favor" com o
  novo preço médio exato; com `stats.window null` não há bloco `range` e o texto diz "Ainda sem dados suficientes";
  `concentracao` sem metas sugere "Defina suas metas"; varredura em todas as saídas de um cenário fixo não encontra
  `/\b(compre|venda|recomendo)\b/i`; `rankBySinceBuy` ordena por `pct` decrescente.
- [ ] Rodar → falha; implementar; → passa. Commit `feat(investimentos): leitura dos números e ranking da carteira`.

### Tarefa 8: Cliente e hooks de mercado no app

**Arquivos:** modificar `apps/app/src/features/finance/data/{quoteRefresher,edgeQuoteClient}.ts`,
`apps/app/src/features/finance/hooks/useInvestments.ts`; criar `apps/app/src/features/finance/hooks/useMarket.ts`;
testes em `apps/app/src/features/finance/__tests__/market.test.ts`.

**Produz:**
```ts
// QuoteClient ganha: history(key: QuoteKey): Promise<PricePoint[]>; market(source, sort, type?): Promise<MarketItem[]>; search(q: string): Promise<MarketItem[]>;
export function usePriceBook(assets: readonly InvestmentAsset[]): { book: PriceBook; loading: boolean }; // memória da sessão, 1 pedido por ativo automático
export function useMarketRank(source: QuoteSource, sort: MarketSort, type?: MarketType): { items: MarketItem[]; status: 'loading' | 'ok' | 'empty' | 'offline' };
export function useSymbolSearch(q: string): { items: MarketItem[]; loading: boolean }; // atraso 250 ms, mínimo SEARCH_MIN, descarta respostas fora de ordem
export function useTargets(): { targets: Targets | null; save(t: Targets): Promise<void> };
```

- [ ] **Teste:** `useSymbolSearch` com digitação "lo"→"log"→"logis" faz um pedido só (250 ms) e ignora a resposta
  atrasada de "log"; offline (`client` lança) → `status 'offline'`, sem exceção; `usePriceBook` não repete pedido do
  mesmo ativo na sessão.
- [ ] Rodar → falha; implementar; → passa. Commit `feat(investimentos): histórico, mercado e busca no app`.

### Tarefa 9: Componentes de gráfico

**Arquivos:** criar `apps/app/src/features/finance/components/charts/{LineChart,Donut,RankBars,Sparkline,index}.tsx`;
modificar `apps/app/src/shared/ui/theme/tokens.ts` (cores `chart.fixed_income|crypto|stocks|reits|funds|other` claro
e escuro); teste `apps/app/src/features/finance/__tests__/charts.test.tsx`.

Cores (validadas para daltonismo no protótipo; claro / escuro): Renda fixa `#2D5BFF`/`#5A7DFF`, Cripto
`#E29936`/`#C8800D`, Ações `#009A9B`/`#008E96`, FIIs `#70449C`/`#7D4DAD`, Fundos `#348F4F`/`#40A35C`; Outros usa
`t.colors.border`. Só no `tokens.ts`.

**Produz:**
```ts
LineChart(props: { series: { values: (number | null)[]; color: string; area?: boolean; dashed?: boolean; label: string }[]; dates: IsoDate[]; reference?: { value: number; label: string }; marks?: number[]; height?: number; format: (v: number) => string })
Donut(props: { slices: { key: string; value: number; color: string; label: string }[]; selected: string | null; onSelect(key: string | null): void; center: ReactNode; size?: number })
RankBars(props: { rows: { key: string; title: string; subtitle?: string; value: number; label: string; color?: string }[]; diverging?: boolean; numbered?: boolean; onPress?(key: string): void })
Sparkline(props: { values: number[]; tone: 'ok' | 'bad' })
```
Comportamento: linha desenha em 1000 ms (`t.easing`), área com opacidade baixa (sem gradiente); arrastar mostra cruz,
ponto e dica com data e valores (gesture-handler `Pan` + toque); rosca com espaço de 2 entre fatias, fatia escolhida
engrossa com mola e as outras esmaecem; barras crescem em cascata de 70 ms; "reduzir movimento" desliga desenho e mola.
Leitores de tela: cada gráfico tem `accessibilityLabel` com o resumo (primeiro e último valor; maior fatia).

- [ ] **Teste:** `LineChart` com valores `null` no começo não desenha antes do primeiro número; dica do índice 0 mostra
  a data formatada; `Donut` chama `onSelect(null)` ao tocar de novo na fatia escolhida; `RankBars` divergente põe
  barra negativa à esquerda do zero.
- [ ] Rodar → falha; implementar; → passa. Commit `feat(investimentos): gráficos de linha, rosca, barras e mini gráfico`.

### Tarefa 10: Tela Investimentos (painel)

**Arquivos:** modificar `apps/app/src/features/finance/screens/InvestmentsScreen.tsx`; criar
`apps/app/src/features/finance/components/{AllocationCard,RankingCard,TargetsSheet,InsightSheet,InsightBlocks}.tsx`;
teste `apps/app/src/features/finance/__tests__/investmentsScreen.test.tsx`.

**Consome:** Tarefas 4–9. Ordem dos blocos (protótipo, Opção A): patrimônio com contagem + tag de resultado + linha
"Investido … · inclui … em dividendos"; cartão do gráfico (legenda Patrimônio/Investido + períodos 1M 6M 1A Tudo,
padrão 1A); `AllocationCard` (`SegmentedControl` Atual/Meta, rosca + lista; sem metas: link "Definir metas");
`RankingCard` (Minha carteira: `rankBySinceBuy` divergente; Mercado: chips Altas hoje · Quedas hoje · Mais
negociadas · Cripto 30 dias · Cripto 1 ano e chips Ações · FIIs · Cripto; bloco some se `status 'empty'`; offline
mostra "Sem conexão: o ranking do mercado volta quando a internet voltar"); cartão "Leitura" com
`portfolioHeadline` (some se null) e botões que abrem `InsightSheet` com `portfolioInsight`; lista com `Sparkline`
e ordenação Valor · Resultado · Nome. `TargetsSheet`: um `Input` numérico por grupo (2 por linha), soma ao vivo,
"Salvar" só com 100.

- [ ] **Teste:** carteira de exemplo renderiza total, 6 grupos na rosca em ordem fixa e a soma "100%" no `TargetsSheet`
  só habilita "Salvar" com 100; ranking Mercado com `status 'empty'` some; trocar a ordenação para Resultado reordena
  a lista.
- [ ] Rodar → falha; implementar; → passa. Conferir no Chrome (claro/escuro, 360 dp, nomes longos).
- [ ] Commit `feat(investimentos): painel com gráfico, alocação, metas, ranking e leitura`.

### Tarefa 11: Detalhe do ativo com abas

**Arquivos:** modificar `apps/app/src/features/finance/screens/InvestmentAssetScreen.tsx`; criar
`apps/app/src/features/finance/components/{AssetStatsGrid,AssetInsightPanel}.tsx`; modificar
`apps/app/src/features/links/hooks/NoteLinker.tsx` (`create(title: string, body?: string)`) e a implementação do
port na feature `notes` (grava `body` como texto da nota); teste `__tests__/investmentAsset.test.tsx`.

Topo: valor com contagem, tag do resultado desde a compra, "Cotação de dd/mm hh:mm · B3/CoinGecko" (manual: "Valor
informado por você"); cartão de posição (Investido, Resultado, Rendeu, Preço hoje, Preço médio, Cotas, Dividendos).
`SegmentedControl` Resumo · Estatísticas · IA · Notas:
- Resumo: `LineChart` do `assetDaily` com `reference` = preço médio e `marks` nos aportes; períodos; movimentos (atual).
- Estatísticas: `AssetStatsGrid` (2 colunas; tocar abre a explicação; rodapé "Com base em N dias de dados";
  sem janela: `EmptyState` curto "Ainda sem dados suficientes: as estatísticas aparecem com 20 pregões").
- IA: `AssetInsightPanel` com chips de `ASSET_QUESTIONS`, blocos revelados em cascata (`Reveal`) e "Salvar como
  nota vinculada" (cria nota com título "Leitura: <ativo> · <pergunta>", corpo = texto dos blocos, e vincula).
- Notas: `LinkedNotesField` com `useLinkedNotes('asset', id)`.

- [ ] **Teste:** aba Estatísticas com 19 pontos mostra o estado vazio; "Salvar como nota vinculada" chama
  `port.create` com título e corpo e a nota aparece na aba Notas; trocar de aba não perde a resposta escolhida.
- [ ] Rodar → falha; implementar; → passa. Conferir no Chrome (claro/escuro, 360 dp).
- [ ] Commit `feat(investimentos): detalhe do ativo com resumo, estatísticas, leitura e notas`.

### Tarefa 12: Busca de ativo com sugestões

**Arquivos:** criar `apps/app/src/features/finance/components/SymbolSearchField.tsx`; modificar
`apps/app/src/features/finance/screens/AssetFormScreen.tsx` e a folha de aporte de ativo automático
(`components/MovementSheet.tsx`, mostrando "Cotação de hh:mm" e preço por cota pré-preenchido); teste
`__tests__/symbolSearch.test.tsx`.

**Produz:** `SymbolSearchField(props: { value: MarketItem | null; onPick(item: MarketItem): void; types?: MarketType[] })`
— `Input` + lista flutuante abaixo (cartão com sombra, por ser flutuante), até 8 opções com ícone do tipo, código e
nome com o trecho destacado, preço e variação do dia; setas/Enter/Esc no web (`accessibilityRole="combobox"`,
opção ativa anunciada); toque no celular; teclado nunca cobre a lista (`Screen` rola). Estado vazio: "Nada encontrado
para "x". Confira o código (ex.: PETR4, HGLG11) ou o nome da moeda." Sem catálogo: diz "Digite o código completo".

- [ ] **Teste:** "logis" lista HGLG11 e BTLG11 com "Logis" destacado; ArrowDown + Enter escolhe a 2ª opção e chama
  `onPick`; 1 letra não abre a lista; escolher preenche código, nome e mostra o preço do dia no formulário.
- [ ] Rodar → falha; implementar; → passa. Conferir no Chrome e no Android (teclado aberto, 360 dp).
- [ ] Commit `feat(investimentos): busca de ativo com sugestões ao digitar`.

### Tarefa 13: Publicação e fechamento

- [ ] Atualizar `docs/prototipos/investimentos.md` com as diferenças do app para o protótipo (sem CDI, sem
  "consistência", sem cotação ao vivo, sem botão da IA) e `PENDENCIAS.md` (o que o usuário confere).
- [ ] Pedir ao usuário (migração já autorizada em 27/11/2026): `pnpm sb db push --remote` (migração da Tarefa 2),
  publicar a função `quotes` e **republicar o `sync-streams.yaml`** no painel do PowerSync (Validate → Deploy).
- [ ] Rodar `pnpm sb db query --remote --read-only --file supabase/tests/rls_check.sql` → 0 linhas.
- [ ] Testar com a chave real pela tela: histórico de 3 meses de ITSA4 aparece; se vier vazio, registrar em "Atenção"
  do `STATUS.md` (só o histórico acumulado vale).
- [ ] Revisão de segurança (skill `revisao-seguranca`), `STATUS.md`, commit `docs(investimentos): fechamento da v2`.
