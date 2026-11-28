// "Leitura dos números": respostas montadas a partir dos dados do usuário e do histórico disponível, sem modelo de
// linguagem. Mostra números, pontos a favor e de atenção e o passado — nunca manda comprar ou vender. Toda frase com
// número de mercado cita a janela; toda leitura termina com o aviso.
import { ALLOCATION_GROUPS, ALLOCATION_LABELS, allocation, contributionToReach, groupOf, type AllocationGroup, type Targets } from "./allocation.ts";
import type { AssetStats } from "./investmentStats.ts";
import type { AssetPosition, InvestmentAsset, InvestmentMovement, Portfolio, PositionedAsset } from "./investments.ts";

export type InsightBlock =
  | { kind: "text"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "list"; tone: "ok" | "warn"; items: string[] }
  | { kind: "numbers"; items: { label: string; value: string; tone?: "ok" | "bad" }[] }
  | { kind: "range"; low: number; mid: number; high: number; caption: string }
  | { kind: "allocation"; before: Record<AllocationGroup, number>; after?: Record<AllocationGroup, number>; targets?: Targets; focus?: AllocationGroup }
  | { kind: "disclaimer"; text: string };

export const INSIGHT_DISCLAIMER = "Análise com dados do período. Não é recomendação de compra ou venda.";

export const ASSET_QUESTIONS = [
  ["desde", "Quanto rendeu desde que comprei?"],
  ["aporte", "Vale a pena aportar mais?"],
  ["historico", "O que o passado mostra?"],
  ["riscos", "Quais os riscos?"],
] as const;
export const PORTFOLIO_QUESTIONS = [
  ["carteira", "Como está minha carteira?"],
  ["melhor", "O que mais rendeu?"],
  ["concentracao", "Estou concentrado em algo?"],
] as const;
export type AssetQuestion = (typeof ASSET_QUESTIONS)[number][0];
export type PortfolioQuestion = (typeof PORTFOLIO_QUESTIONS)[number][0];

export interface AssetInsightContext {
  asset: InvestmentAsset;
  position: AssetPosition;
  stats: AssetStats;
  portfolio: Portfolio;
  targets: Targets | null;
  movements: readonly InvestmentMovement[];
  money: (cents: number) => string;
}
export interface PortfolioInsightContext {
  portfolio: Portfolio;
  targets: Targets | null;
  money: (cents: number) => string;
}

const SIMULATED_CENTS = 100_000; // R$ 1.000
const NO_DATA = "Ainda sem dados suficientes: as estatísticas de mercado aparecem com 20 pregões de histórico.";
const E14 = 100_000_000_000_000n;

const pct = (fraction: number, digits = 1) =>
  `${Math.abs(fraction * 100).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
const pctS = (fraction: number) => `${fraction < 0 ? "−" : "+"}${pct(fraction)}`;
const moneyS = (money: (c: number) => string, c: number) => `${c < 0 ? "− " : "+ "}${money(Math.abs(c))}`;
const dmy = (iso: string) => iso.split("-").reverse().join("/");
const tail = (blocks: InsightBlock[]): InsightBlock[] => [...blocks, { kind: "disclaimer", text: INSIGHT_DISCLAIMER }];
const windowText = (s: AssetStats) => (s.window ? `nos últimos ${s.window.days} pregões` : "");
const OSC_LABEL = { low: "Baixa", medium: "Média", high: "Alta" } as const;

function shares(p: Portfolio, add?: { group: AllocationGroup; cents: number }): Record<AllocationGroup, number> {
  const s = allocation(p, null);
  const total = p.total + (add?.cents ?? 0);
  return Object.fromEntries(
    s.map((x) => [x.group, total > 0 ? ((x.total + (add && add.group === x.group ? add.cents : 0)) / total) * 100 : 0]),
  ) as Record<AllocationGroup, number>;
}

function avgCents(position: AssetPosition): number | null {
  if (!position.units || position.units <= 0 || position.invested <= 0) return null;
  return Number((BigInt(position.invested) * E14) / BigInt(position.units)) / 1e6;
}

export function assetInsight(q: AssetQuestion, c: AssetInsightContext): InsightBlock[] {
  const { asset, position: pos, stats: s, money } = c;
  const name = asset.name;
  const group = groupOf(asset.kind);
  const priceCents = asset.last_price_e8 !== null ? asset.last_price_e8 / 1e6 : null;

  if (q === "desde") {
    const out: InsightBlock[] = [
      {
        kind: "text",
        text: `Você começou em ${pos.firstDate ? dmy(pos.firstDate) : "—"} e hoje tem ${money(pos.current)} em ${name}. O resultado é ${moneyS(money, pos.result)} (${pctS(pos.pct)})${pos.income ? `, contando ${money(pos.income)} em rendimentos` : ""}.`,
      },
      {
        kind: "numbers",
        items: [
          { label: "Investido", value: money(pos.invested) },
          { label: "Hoje", value: money(pos.current) },
          { label: "Resultado", value: pctS(pos.pct), tone: pos.result < 0 ? "bad" : "ok" },
          { label: "Rendimentos em 12 meses", value: money(s.income12m) },
        ],
      },
    ];
    if (s.window && s.periodReturn !== null)
      out.push({ kind: "text", text: `${windowText(s)[0]!.toUpperCase()}${windowText(s).slice(1)}, o preço variou ${pctS(s.periodReturn)}.` });
    return tail(out);
  }

  if (q === "aporte") {
    const pro: string[] = [];
    const con: string[] = [];
    if (!s.window) con.push(NO_DATA);
    else if (s.periodReturn !== null) (s.periodReturn >= 0 ? pro : con).push(`Variou ${pctS(s.periodReturn)} ${windowText(s)}.`);
    const avg = avgCents(pos);
    if (avg !== null && priceCents !== null && priceCents < avg && pos.units) {
      const units = pos.units / 1e8 + SIMULATED_CENTS / priceCents;
      const newAvg = Math.round((pos.invested + SIMULATED_CENTS) / units);
      pro.push(`Está ${pct(1 - priceCents / avg)} abaixo do seu preço médio: R$ 1.000 agora levariam o preço médio de ${money(Math.round(avg))} para ${money(newAvg)}.`);
    }
    if (s.income12m > 0) pro.push(`Pagou ${money(s.income12m)} em rendimentos nos últimos 12 meses (${pct(s.yieldOnCost ?? 0)} do que você investiu).`);
    if (s.oscillation === "high") con.push(`Oscila bastante: ${pct(s.volatility ?? 0, 0)} ao ano ${windowText(s)}.`);
    if (s.maxDrawdown !== null && s.maxDrawdown <= -0.2) con.push(`Já caiu ${pct(-s.maxDrawdown, 0)} do topo ao fundo ${windowText(s)}.`);
    const before = shares(c.portfolio);
    if (c.targets) {
      const target = c.targets[group];
      if (before[group] > target) con.push(`${ALLOCATION_LABELS[group]} já são ${pct(before[group] / 100, 0)} da carteira, acima da sua meta de ${target}%.`);
      else pro.push(`${ALLOCATION_LABELS[group]} estão em ${pct(before[group] / 100, 0)} da carteira, abaixo da sua meta de ${target}%: um aporte aproxima da meta.`);
    }
    return tail([
      { kind: "heading", text: "A favor" },
      { kind: "list", tone: "ok", items: pro.length ? pro : ["Nenhum ponto forte se destaca nos números do período."] },
      { kind: "heading", text: "Pontos de atenção" },
      { kind: "list", tone: "warn", items: con.length ? con : ["Nenhum alerta forte nos números do período."] },
      { kind: "heading", text: `Sua carteira com + R$ 1.000 em ${name}` },
      { kind: "allocation", before, after: shares(c.portfolio, { group, cents: SIMULATED_CENTS }), focus: group, ...(c.targets ? { targets: c.targets } : {}) },
      { kind: "text", text: "Quem decide é você: compare com seu objetivo (prazo e quanto de oscilação você aceita) e com as suas notas." },
    ]);
  }

  if (q === "historico") {
    if (!s.window || s.periodReturn === null || s.volatility === null) return tail([{ kind: "text", text: NO_DATA }]);
    const spread = s.volatility * Math.sqrt(s.window.days / 252);
    const mid = s.periodReturn * 100;
    return tail([
      { kind: "text", text: "Ninguém sabe o retorno futuro. O que dá para ver é o passado recente:" },
      {
        kind: "range",
        low: mid - spread * 100,
        mid,
        high: mid + spread * 100,
        caption: `Nos últimos ${s.window.days} pregões, ${name} variou ${pctS(s.periodReturn)}; com a oscilação do período, algo entre ${pctS(s.periodReturn - spread)} e ${pctS(s.periodReturn + spread)} seria comum numa janela igual.`,
      },
      { kind: "text", text: "Passado não garante o futuro: resultados de empresas, juros e câmbio mudam esse quadro." },
    ]);
  }

  // riscos
  const share = c.portfolio.total > 0 ? pos.current / c.portfolio.total : 0;
  const L: string[] = [];
  if (asset.kind === "crypto") L.push("Cripto não tem empresa nem lucro por trás: o preço depende de oferta e procura e pode cair mais de 50%.");
  if (asset.kind === "stocks") L.push("O preço acompanha os resultados da empresa e o humor do mercado; um trimestre ruim derruba a ação.");
  if (asset.kind === "reits") L.push("Os rendimentos dependem de aluguéis: imóvel vazio e inadimplência reduzem o que você recebe.");
  if (group === "fixed_income") L.push("Oscila pouco. Os riscos principais são a inflação comer parte do ganho e o emissor quebrar (CDB tem garantia do FGC até R$ 250 mil).");
  if (asset.kind === "funds" || asset.kind === "other") L.push("Confira as taxas e o prazo de resgate: eles mudam o que sobra para você.");
  if (s.maxDrawdown !== null && s.maxDrawdown <= -0.2) L.push(`Já caiu ${pct(-s.maxDrawdown, 0)} do topo ao fundo ${windowText(s)}.`);
  if (share > 0.15) L.push(`Sozinho, é ${pct(share, 0)} do seu patrimônio: se cair, pesa na carteira toda.`);
  if (!s.window) L.push(NO_DATA);
  return tail([
    {
      kind: "numbers",
      items: [
        { label: "Oscilação", value: s.oscillation ? `${OSC_LABEL[s.oscillation]} (${pct(s.volatility ?? 0, 0)} ao ano)` : "—" },
        { label: "Maior queda", value: s.maxDrawdown !== null ? `−${pct(-s.maxDrawdown, 0)}` : "—", ...(s.maxDrawdown !== null && s.maxDrawdown <= -0.2 ? { tone: "bad" as const } : {}) },
        { label: "Peso na carteira", value: pct(share) },
      ],
    },
    { kind: "list", tone: "warn", items: L },
  ]);
}

export function rankBySinceBuy(p: Portfolio): { asset: InvestmentAsset; pct: number; result: number }[] {
  return p.groups
    .flatMap((g) => g.assets)
    .map((x: PositionedAsset) => ({ asset: x.asset, pct: x.position.pct, result: x.position.result }))
    .sort((a, b) => b.pct - a.pct || a.asset.name.localeCompare(b.asset.name, "pt-BR"));
}

const overweight = (p: Portfolio, targets: Targets) =>
  allocation(p, targets)
    .filter((x) => x.diff !== null && x.diff > 3)
    .sort((a, b) => b.diff! - a.diff!);

/** Frase do cartão "Leitura": o grupo mais acima da meta (mais de 3 pontos); null sem metas ou equilibrada. */
export function portfolioHeadline(p: Portfolio, targets: Targets | null): string | null {
  if (!targets || p.total <= 0) return null;
  const top = overweight(p, targets)[0];
  if (!top) return null;
  return `${ALLOCATION_LABELS[top.group]} são ${pct(top.share, 0)} da sua carteira, acima da meta de ${targets[top.group]}%. Quer ver como equilibrar só com aportes?`;
}

export function portfolioInsight(q: PortfolioQuestion, c: PortfolioInsightContext): InsightBlock[] {
  const { portfolio: p, money } = c;
  const ranked = rankBySinceBuy(p);
  const count = ranked.length;
  if (q === "carteira") {
    const out: InsightBlock[] = [
      {
        kind: "text",
        text: `Você tem ${money(p.total)} em ${count} ${count === 1 ? "ativo" : "ativos"}. Investiu ${money(p.invested)} e o resultado é ${moneyS(money, p.result)} (${pctS(p.pct)}).`,
      },
      { kind: "heading", text: "Como está dividido" },
      { kind: "allocation", before: shares(p), ...(c.targets ? { targets: c.targets } : {}) },
    ];
    if (count > 1)
      out.push({ kind: "text", text: `O destaque é ${ranked[0]!.asset.name} (${pctS(ranked[0]!.pct)}); quem mais pesa contra é ${ranked.at(-1)!.asset.name} (${pctS(ranked.at(-1)!.pct)}).` });
    return tail(out);
  }
  if (q === "melhor") {
    return tail([
      { kind: "heading", text: "Desde que você comprou" },
      { kind: "numbers", items: ranked.slice(0, 6).map((r) => ({ label: r.asset.name, value: pctS(r.pct), tone: r.pct < 0 ? ("bad" as const) : ("ok" as const) })) },
      { kind: "text", text: "Ativos com pouco tempo de carteira ainda não tiveram tempo de render." },
    ]);
  }
  // concentracao
  if (!c.targets) return tail([{ kind: "text", text: "Defina suas metas por tipo para ver se a carteira está equilibrada." }, { kind: "allocation", before: shares(p) }]);
  const over = overweight(p, c.targets);
  const out: InsightBlock[] = [
    {
      kind: "text",
      text: over.length
        ? `Sim. ${over.map((x) => `${ALLOCATION_LABELS[x.group]} são ${pct(x.share, 0)} da carteira (meta ${c.targets![x.group]}%)`).join("; ")}.`
        : "Não. Sua carteira está perto das metas que você definiu.",
    },
    { kind: "allocation", before: shares(p), targets: c.targets },
  ];
  if (over.length) {
    const need = contributionToReach(p, c.targets);
    const parts = ALLOCATION_GROUPS.filter((g) => (need[g] ?? 0) > 0).map((g) => `${money(need[g]!)} em ${ALLOCATION_LABELS[g]}`);
    if (parts.length) out.push({ kind: "text", text: `Para voltar às metas só com aportes, sem resgatar nada: ${parts.join(", ")}.` });
  }
  return tail(out);
}
