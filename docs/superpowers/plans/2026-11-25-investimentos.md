# Investimentos com cotação automática — plano de implementação

> **Para agentes:** use superpowers:subagent-driven-development ou superpowers:executing-plans, tarefa por tarefa.
> Passos com checkbox (`- [ ]`).

**Objetivo:** Investimentos dentro de Finanças (ativos, movimentos, patrimônio) com cotação automática de ações, FIIs e
cripto por uma Edge Function, preparada para alerta de preço.

**Arquitetura:** regras puras no `packages/domain` (`quotes/` para cotação, `finance/investments*.ts` para ativos);
repositório sobre o mesmo `FinanceStore` de Finanças; Edge Function `quotes` com provedores injetados e cache em
`private.market_quotes`; telas em `features/finance` conforme o protótipo.

**Stack:** TypeScript, Zod 4, Vitest, PGlite, Expo Router, PowerSync, Supabase Edge Functions (Deno).

**Spec:** `docs/superpowers/specs/2026-11-25-investimentos-design.md` (leia junto).
Protótipo: Claude Design, projeto `e085c8e7-a0f8-47b5-96f2-ec2d4d51caa0`, `InvestimentosTela.dc.html` (lógica de
cálculo, textos e estados das telas).

## Restrições globais

- Regras do `AGENTS.md` valem em tudo (tokens, `Input`/`MoneyField`, teclado do aparelho, 360 dp, dois temas, sem hex).
- Dinheiro em centavos inteiros; quantidade em unidades × 10⁸ (`quantity`); preço em R$ × 10⁸ (`last_price_e8`,
  `price_e8`). Produtos em `BigInt`.
- `packages/domain` sem React/Expo/Supabase/PowerSync; imports relativos com `.ts`.
- Nada de chave, ref ou URL do Supabase em arquivo versionado. Secrets: `BRAPI_TOKEN`, `COINGECKO_DEMO_KEY`.
- Cache de cotação: 30 min no servidor (`QUOTE_TTL_MS = 30 * 60 * 1000`) e 30 min no app antes de pedir de novo.
- Máximo de 50 símbolos por pedido; ticker `^[A-Z0-9]{4,12}$`; id de cripto `^[a-z0-9-]{1,64}$`.
- Antes de cada commit: `pnpm lint && pnpm typecheck && pnpm test`. Commits `tipo(área): descrição`, sem co-autoria.
- Migração commitada não se edita.

## Foco da revisão

1. Sem internet ou com a função fora do ar: telas abrem com o último preço e "Cotação de dd/mm hh:mm"; nunca erro em tela cheia.
2. Ticker inexistente ou cripto removida: o erro vem por símbolo; os outros ativos ainda atualizam.
3. Resgate maior que o valor atual / quantidade maior que as cotas: aviso na folha; o domain recusa cotas negativas.
4. Valor gigante (R$ 1.234.567,89) e frações de BTC (0,00012345) sem perder precisão.
5. Desfazer depois de "Já tenho", "Encerrar" e excluir movimento volta tudo junto, sem duplicar.

---

### Tarefa 1: Módulo de cotação no domain (`@glife/domain/quotes`)

**Arquivos:** criar `packages/domain/src/quotes/{index,model,brapi,coingecko,service}.ts` e
`packages/domain/src/quotes/__tests__/{brapi,coingecko,service}.test.ts`.

**Produz:**
```ts
export const QUOTE_SOURCES = ['brapi', 'coingecko'] as const; export type QuoteSource = …;
export const QUOTE_TTL_MS: number; export const QUOTE_BATCH_MAX = 50;
export interface QuoteKey { source: QuoteSource; symbol: string }
export interface Quote extends QuoteKey { priceE8: number; name: string; quotedAt: string /*ISO*/ }
export interface QuoteError extends QuoteKey { reason: 'not_found' | 'unavailable' }
export interface QuoteResult { quotes: Quote[]; errors: QuoteError[] }
export interface LookupItem { source: QuoteSource; symbol: string; name: string; ticker: string; priceE8: number | null }
export type FetchFn = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
export interface QuoteProvider { readonly source: QuoteSource; fetchQuotes(symbols: readonly string[]): Promise<QuoteResult>; lookup(query: string): Promise<LookupItem[]> }
export interface QuoteCache { get(keys: readonly QuoteKey[]): Promise<(Quote & { fetchedAt: string })[]>; put(quotes: readonly Quote[]): Promise<void> }
export class BrapiProvider implements QuoteProvider { constructor(o: { fetch: FetchFn; token: string | null }) }
export class CoinGeckoProvider implements QuoteProvider { constructor(o: { fetch: FetchFn; demoKey: string | null }) }
export class QuoteService { constructor(o: { providers: readonly QuoteProvider[]; cache: QuoteCache; now?: () => Date }); getQuotes(keys: readonly QuoteKey[]): Promise<QuoteResult>; lookup(source: QuoteSource, query: string): Promise<LookupItem[]> }
export const quoteKeySchema, quoteRequestSchema; // Zod: { action: 'quotes', items: QuoteKey[] (1..50) } | { action: 'lookup', source, query (1..40) }
export function toE8(price: number): number; // Math.round(price * 1e8), recusa NaN/negativo
```

- [ ] **Teste (brapi):** `fetchQuotes(['ITSA4','HGLG11'])` faz 2 chamadas a
  `https://brapi.dev/api/quote/ITSA4?token=T` (1 ticker por chamada) e devolve `priceE8: 1023000000` para
  `regularMarketPrice: 10.23`, `name` = `longName ?? shortName`, `quotedAt` = `regularMarketTime`; status 404 vira
  `errors: [{ reason: 'not_found' }]`, 5xx/exceção vira `unavailable`, sem derrubar os outros. Sem token: usa a URL sem
  `token`. `lookup('itsa4')` = um item (ticker em maiúsculas) ou `[]`.
- [ ] **Teste (coingecko):** uma chamada a `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_last_updated_at=true`
  com cabeçalho `x-cg-demo-api-key` quando há chave; id ausente na resposta = `not_found`; `last_updated_at` (s) vira ISO.
  `lookup('btc')` chama `/api/v3/search?query=btc` e devolve até 8 moedas `{ symbol: id, name, ticker: SYMBOL maiúsculo, priceE8: null }`.
- [ ] **Teste (service):** com cache de 10 min devolve do cache sem chamar o provedor; com cache de 31 min chama o
  provedor, grava no cache e devolve o novo; mistura fontes roteando cada símbolo ao provedor certo; símbolo inválido
  rejeitado por `quoteRequestSchema`; 51 itens rejeitados.
- [ ] Rodar `pnpm --filter @glife/domain test quotes` → falha; implementar; → passa.
- [ ] Commit `feat(investimentos): cotação no domain (brapi, coingecko e cache)`.

### Tarefa 2: Modelo e cálculos de investimento

**Arquivos:** criar `packages/domain/src/finance/investments.ts`, `__tests__/investments.test.ts`; exportar em
`finance/index.ts`.

**Consome:** `build`, `patch`, `singleLine`, `issue` de `model.ts`; `QuoteSource` de `../quotes/index.ts`.
**Produz:**
```ts
export const ASSET_KINDS = ['fixed_income','treasury','stocks','reits','funds','savings','crypto','other'] as const;
export const ASSET_KIND_LABELS: Record<AssetKind, string>; // Renda fixa, Tesouro Direto, Ações, FIIs, Fundos, Poupança, Cripto, Outro
export const MOVEMENT_KINDS = ['contribution','withdrawal','income','quote'] as const;
export const QTY_SCALE = 100_000_000;
export function quoteSourceOf(kind: AssetKind): QuoteSource | null; // stocks|reits→brapi, crypto→coingecko
export const isAutoQuoted = (kind: AssetKind) => quoteSourceOf(kind) !== null;
export type InvestmentAsset; InvestmentAssetDraft; InvestmentAssetPatch; newInvestmentAsset; applyInvestmentAssetPatch;
export type InvestmentMovement; InvestmentMovementDraft; InvestmentMovementPatch; newInvestmentMovement; applyInvestmentMovementPatch;
export function canChangeKind(from: AssetKind, to: AssetKind, hasMovements: boolean): boolean;
export interface AssetPosition { invested: number; current: number; units: number | null; income: number; result: number; pct: number; closed: boolean; hasPrice: boolean; lastQuoteDate: IsoDate | null; lastDate: IsoDate | null; firstDate: IsoDate | null; series: { date: IsoDate; value: number }[] }
export function assetPosition(asset: InvestmentAsset, movements: readonly InvestmentMovement[], today: IsoDate, excludeId?: string): AssetPosition;
export interface Portfolio { total: number; invested: number; result: number; pct: number; updated: IsoDate | null; groups: { kind: AssetKind; total: number; share: number; assets: … }[]; closed: … }
export function portfolio(assets, movements, today): Portfolio;
export function unitsValue(unitsE8: number, priceE8: number): number; // centavos, BigInt, meio para cima
export interface AccountFlow { account_id: string; amount_cents: number /* + entra, − sai */; date: IsoDate; description: string; key: string }
export function accountFlows(assets, movements): AccountFlow[]; // só vivos; "Aporte · <nome>" / "Resgate · <nome>"
```
Campos e limites exatamente como na seção "Modelo" do spec (`name` 1–120, `institution` ≤ 80, `notes` ≤ 500 no ativo e
≤ 200 no movimento). Regras de linha no Zod: `quote_symbol` obrigatório e no formato da fonte só em tipo automático
(nulo nos outros); `amount_cents` > 0 exceto `income` (≠ 0); `account_id` só em contribution/withdrawal; `quantity`
> 0 ou nulo.

- [ ] **Testes** (usar os dados do protótipo): manual `a1` (Tesouro IPCA+) → investido 1.131.000,00, atual
  1.234.567,89 com a cotação de 22/11; resgate total (`a9`) → `closed`, `pct` sobre aportes; automático com 2 aportes
  (100 cotas a 10,00; 50 a 12,00) e `last_price_e8` 13,00 → `units` 150·10⁸, atual 1.950,00, investido 1.600,00,
  rendimento 30,00 → resultado 380,00; automático sem preço → atual = investido, `hasPrice: false`; BTC
  0,00012345 × 500.000,00 → 61,73 (arredonda); `portfolio` agrupa e ordena por total e põe encerrados à parte;
  `canChangeKind('stocks','reits',true)` true, `('stocks','crypto',true)` false, `('stocks','crypto',false)` true,
  `('treasury','stocks',true)` false; `accountFlows` ignora movimento e ativo excluídos.
- [ ] Falha → implementar → passa. Commit `feat(investimentos): modelo e cálculos de ativos`.

### Tarefa 3: Banco, sync e cache do servidor

**Arquivos:** criar `supabase/migrations/20261125000002_finance_investimentos.sql`, `supabase/tests/investments.test.ts`;
alterar `supabase/powersync/sync-streams.yaml`, `apps/app/src/features/finance/data/schema.ts`.

- `public.investment_assets` e `public.investment_movements` no molde de `20261125000001_finance_compras.sql`
  (`vida_apply_standard`, FKs compostas: `asset_id` com `on delete cascade`, `account_id` com `on delete set null (account_id)`),
  checks de linha do spec, índice `(user_id, asset_id)`, `alter publication powersync add table …`.
- `create schema private` (se não existir; `revoke all on schema private from public, anon, authenticated`),
  `private.market_quotes`, e `public.market_quotes_get(keys jsonb) returns setof …` /
  `public.market_quotes_put(quotes jsonb) returns void` com `security definer`, `set search_path = ''`,
  `revoke execute … from public, anon, authenticated` e `grant execute … to service_role`.
- `sync-streams.yaml`: duas consultas novas no padrão das outras. PowerSync: tabelas no `schema.ts`.
- [ ] **Testes PGlite:** B não lê ativo de A; A não liga movimento ao ativo/conta de B; `income` com 0 recusado;
  `quantity` negativa recusada; `authenticated` não executa `market_quotes_get`/`_put` nem lê `private.market_quotes`;
  `service_role` grava e lê. Os testes existentes de RLS e sync-streams continuam passando.
- [ ] `pnpm test` passa. Commit `feat(investimentos): tabelas, sync e cache de cotações`.

### Tarefa 4: Repositório de investimentos

**Arquivos:** criar `packages/domain/src/finance/investmentsRepository.ts`, `packages/domain/src/testing/investmentsContract.ts`;
alterar `finance/repository.ts` (`FinanceRows` + `investment_assets`, `investment_movements`; `FinanceStore.watchInvestments`;
`FinanceRepositories.investments`), `testing/financeMemory.ts`, `testing/index.ts`, `testing/__tests__/inMemory.test.ts`,
`apps/app/src/features/finance/data/localFinanceStore.ts`, `apps/app/tests/localRepositories.test.ts`.

**Produz:**
```ts
export interface InvestmentsSnapshot { assets: InvestmentAsset[]; movements: InvestmentMovement[] }
export interface InvestmentsRepository {
  snapshot(): Promise<InvestmentsSnapshot>; watch(l: Listener<InvestmentsSnapshot>, onError?: ErrorListener): Unsubscribe;
  createAsset(draft: InvestmentAssetDraft, opening?: { investedCents: number; currentCents?: number; quantity?: number; date: IsoDate }): Promise<InvestmentAsset>;
  updateAsset(id: string, patch: InvestmentAssetPatch): Promise<InvestmentAsset>; // valida canChangeKind
  removeAsset(id: string): Promise<string[]>; restoreAsset(id: string, movementIds: readonly string[]): Promise<void>;
  addMovement(draft: InvestmentMovementDraft): Promise<InvestmentMovement>;
  updateMovement(id: string, patch: InvestmentMovementPatch): Promise<InvestmentMovement>;
  removeMovement(id: string): Promise<void>; restoreMovement(id: string): Promise<void>;
  close(id: string, date: IsoDate): Promise<InvestmentMovement>; // resgate do valor atual (e de todas as cotas)
  applyQuotes(quotes: readonly Quote[]): Promise<number>; // atualiza ativos vivos da mesma fonte+símbolo se quotedAt mais novo
}
```
Regras de referência (no repositório): conta existe, viva e não é cartão; movimento `quote` recusado em ativo automático;
`quantity` obrigatória em aporte/resgate de automático e proibida em manual; resgate não deixa cotas negativas;
`close` sem preço em automático = `validation`. Tudo em `store.transaction` (tudo ou nada).

- [ ] **Contrato** (`investmentsRepositoryContract`): cria com abertura manual (aporte + cotação, um desfazer remove
  os três); abertura automática (aporte com quantidade); recusa conta-cartão; recusa cotação em ação; recusa resgate
  acima das cotas; `close` gera resgate com o valor atual; `applyQuotes` atualiza só o símbolo certo e ignora cotação
  mais velha; `removeAsset` + `restoreAsset` voltam ativo e movimentos.
- [ ] Rodar o contrato na memória e no local (`localRepositories.test.ts`). Commit `feat(investimentos): repositório com desfazer`.

### Tarefa 5: Aporte e resgate no saldo das contas

**Arquivos:** `packages/domain/src/finance/{ledger,overview}.ts` e testes; `apps/app/src/features/finance/hooks/FinanceData.tsx`;
chamadas de `accountBalance` em `useFlows.tsx`, `PurchaseSheet.tsx`, `FinanceHomeScreen.tsx`.

- `accountBalance(account, txs, flows: readonly AccountFlow[] = [])`; `FinanceData` ganha `flows: AccountFlow[]`
  (lido junto com contas e categorias; o provider também observa `repos.investments.watch`). `projectBalance`,
  `monthOverview` (saldo de hoje) e `statement` passam `data.flows`; `statement` mostra cada fluxo como entrada
  realizada (`type: 'transfer'`, `category_id: null`, descrição do fluxo). `monthSummary` e orçamentos **não** mudam.
- [ ] **Testes:** saldo com aporte de 500,00 cai 500,00; resgate sobe; extrato lista "Aporte · HGLG11"; resumo do mês igual com e sem fluxos.
- [ ] Commit `feat(financas): aportes e resgates no saldo e no extrato`.

### Tarefa 6: Edge Function `quotes`

**Arquivos:** criar `supabase/functions/_shared/auth.ts`, `supabase/functions/quotes/{index,handler,cache}.ts`,
`supabase/tests/quotes.test.ts`; alterar `supabase/functions/deno.json` (imports `@glife/domain/quotes` e `zod` → `npm:zod@^4.6.7`).

**Produz:** `requireAal2(req, verify: (jwt: string) => Promise<Record<string, unknown> | null>): Promise<{ userId: string } | Response>`
(401 sem token/inválido, 403 se `aal !== 'aal2'`); `createHandler(deps: { verify; service: QuoteService }): (req) => Promise<Response>`;
`supabaseQuoteCache(admin)` chamando as RPCs da Tarefa 3. `index.ts` monta tudo com `Deno.env` (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `BRAPI_TOKEN`, `COINGECKO_DEMO_KEY`) e `supabase.auth.getClaims`.

- [ ] **Testes** (padrão de `hello.test.ts`, `vi.mock` dos aliases): sem `Authorization` → 401; `aal1` → 403; corpo
  inválido / 51 itens → 400 com mensagem em português; `POST` válido → 200 `{ quotes, errors }`; `lookup` → `{ items }`;
  só `POST` e `OPTIONS` (CORS com `Access-Control-Allow-Origin: *`, cabeçalhos `authorization, x-client-info, apikey, content-type`).
- [ ] `deno check --config supabase/functions/deno.json supabase/functions/quotes/index.ts`. Commit `feat(investimentos): edge function de cotações`.

### Tarefa 7: Cotação no app

**Arquivos:** criar `apps/app/src/features/finance/data/edgeQuoteClient.ts`, `hooks/useInvestments.ts`,
`hooks/useRefreshQuotes.ts`; alterar `FinanceData.tsx` (prop `quotes: QuoteClient`), `index.ts`, `src/app/_layout.tsx`.

**Produz:** `interface QuoteClient { quotes(keys: readonly QuoteKey[]): Promise<QuoteResult>; lookup(source: QuoteSource, query: string): Promise<LookupItem[]> }`;
`createEdgeQuoteClient(supabase: SupabaseClient): QuoteClient` (`functions.invoke('quotes', { body })`);
`useInvestments(): InvestmentsSnapshot | null`; `useRefreshQuotes(snapshot): { refreshing: boolean; refresh(force?: boolean): Promise<void> }`
— `useFocusEffect` dispara `refresh()`; pede só ativos automáticos vivos com `last_price_at` nulo ou > 30 min
(`force` ignora o limite do app); grava com `repos.investments.applyQuotes`; erros só no `console.warn`; offline não chama.

- [ ] **Teste** do `useRefreshQuotes` com `QuoteClient` falso: não chama com preço de 10 min; chama com 31 min; `force` chama; falha não lança.
- [ ] Commit `feat(investimentos): cotação automática ao abrir as telas`.

### Tarefa 8: Telas — lista e detalhe

**Arquivos:** `screens/InvestmentsScreen.tsx`, `screens/InvestmentAssetScreen.tsx`, `components/investmentRows.tsx`,
`components/AssetChart.tsx` (SVG com `react-native-svg`, linha + ponto final, monocromático); rotas
`src/app/financas/investimentos.tsx`, `src/app/financas/investimento/[id].tsx`; linha "Investimentos" com o
patrimônio em `FinanceHomeScreen` (Planejamento, ao lado de Compras), que também usa `useRefreshQuotes`.

Conforme o protótipo (1a–1c, 2a–2c): patrimônio com contagem animada, resultado colorido (`ok`/`err`), "Atualizado em";
barra de distribuição com destaque só no maior; grupos por tipo com %; "Encerrados" recolhido; detalhe com valor,
investido, resultado, "Cotação de dd/mm hh:mm" (automático) ou "Última cotação em" (manual), gráfico, ações em pílulas
(sem "Cotação" no automático), histórico por mês, menu ⋯ (Editar, Encerrar, Excluir com desfazer). Puxar para atualizar força a cotação.

- [ ] Conferir no web nos dois temas em 360 dp com os nomes longos do protótipo. Commit `feat(investimentos): lista e detalhe`.

### Tarefa 9: Telas — folha de movimento e cadastro do ativo

**Arquivos:** `components/MovementSheet.tsx`, `screens/AssetFormScreen.tsx`, rotas `src/app/financas/investimento/novo.tsx`
e `src/app/financas/investimento/editar/[id].tsx`.

Folha (3a–3e): `SegmentedControl` de tipo (sem Cotação em automático), Ganho/Perda no Rendimento, `MoneyField`,
Quantidade (`Input`, `decimal-pad`) em aporte/resgate de automático, data (`DateRow`), conta (só não-cartão) com aviso
de saldo, observação, linha de efeito do protótipo, Excluir na edição. Cadastro (4a–4c): nome, tipo em chips 2 por
linha (desabilitados quando `canChangeKind` é falso), "Código" com `lookup` (ações/FIIs: confere o ticker e mostra
nome + preço; cripto: lista de resultados), instituição, observação, "Já tenho este investimento" (manual: investido +
atual; automático: quantidade + investido).

- [ ] Conferir teclado sem cobrir campo, troca de tipo sem mudar a altura, 360 dp. Commit `feat(investimentos): movimento e cadastro do ativo`.

### Tarefa 10: Documentação e verificação final

- [ ] `docs/prototipos/investimentos.md` (no formato de `compras.md`: o que foi feito e as diferenças do protótipo).
- [ ] `PLANO_DE_IMPLEMENTACAO.md`: marcar Investimentos; `STATUS.md` novo (≤ 10 linhas) com o que falta ao usuário:
  `pnpm sb db push --remote`, republicar o sync-streams, criar contas brapi/CoinGecko, `pnpm sb secrets set …` e
  `pnpm sb functions deploy quotes`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes. Commit `docs(investimentos): protótipo, plano e status`.
