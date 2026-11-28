// Regras puras do detalhe do ativo: o que o gráfico desenha (preço com o preço médio, ou o valor dia a dia) e o texto
// da nota criada a partir de uma "leitura dos números".
import { assetDaily, assetPosition, isAutoQuoted, slicePeriod, type InsightBlock, type InvestmentAsset, type InvestmentMovement, type Period } from '@glife/domain/finance';
import type { PricePoint } from '@glife/domain/quotes';

export interface AssetChartData {
  kind: 'price' | 'value';
  /** centavos */
  values: number[];
  dates: string[];
  reference: { value: number; label: string } | null;
  /** índices dos dias com aporte */
  marks: number[];
}

const E14 = 100_000_000_000_000n;

export function assetChartData(asset: InvestmentAsset, movements: readonly InvestmentMovement[], prices: readonly PricePoint[], today: string, period: Period): AssetChartData {
  const mine = movements.filter((m) => m.asset_id === asset.id && m.deleted_at === null);
  const buys = new Set(mine.filter((m) => m.kind === 'contribution').map((m) => m.date));
  if (isAutoQuoted(asset.kind) && prices.length > 1) {
    const pts = slicePeriod(prices, period, today);
    const pos = assetPosition(asset, mine, today);
    const avg = pos.units && pos.units > 0 && pos.invested > 0 ? Math.round(Number((BigInt(pos.invested) * E14) / BigInt(pos.units)) / 1e6) : null;
    return {
      kind: 'price',
      values: pts.map((p) => Math.round(p.closeE8 / 1e6)),
      dates: pts.map((p) => p.date),
      reference: avg !== null ? { value: avg, label: 'seu preço médio' } : null,
      marks: pts.flatMap((p, i) => (buys.has(p.date) ? [i] : [])),
    };
  }
  const daily = slicePeriod(assetDaily(asset, mine, [], today), period, today);
  return {
    kind: 'value',
    values: daily.map((d) => d.value),
    dates: daily.map((d) => d.date),
    reference: null,
    marks: daily.flatMap((d, i) => (buys.has(d.date) ? [i] : [])),
  };
}

/** Nota (Markdown) com a leitura: título "Leitura: <ativo> · <pergunta>", corpo com os blocos e a data. */
export function insightNote(assetName: string, question: string, blocks: readonly InsightBlock[], date: string): { title: string; body: string } {
  const parts = blocks.map((b) => {
    switch (b.kind) {
      case 'text':
        return b.text;
      case 'heading':
        return `## ${b.text}`;
      case 'list':
        return b.items.map((i) => `- ${i}`).join('\n');
      case 'numbers':
        return b.items.map((i) => `- ${i.label}: ${i.value}`).join('\n');
      case 'range':
        return b.caption;
      case 'allocation':
        return '';
      case 'disclaimer':
        return `_${b.text}_`;
    }
  });
  return { title: `Leitura: ${assetName} · ${question}`, body: [...parts.filter(Boolean), `_Gerada pelo Glife em ${date}._`].join('\n\n') };
}
