// Regras puras da busca de ativo com sugestões: destaque do trecho (sem acento e sem caixa), setas do teclado,
// tipo de mercado de cada tipo de ativo e o total de um aporte pelo preço de hoje.
import { unitsValue, type AssetKind } from '@glife/domain/finance';
import type { MarketType } from '@glife/domain/quotes';

const fold = (ch: string) =>
  ch
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Pedaços do texto com o trecho que casou com `query` marcado (`hit`). */
export function highlightParts(text: string, query: string): { text: string; hit: boolean }[] {
  const chars = [...text];
  const folded = chars.map(fold);
  const q = fold(query.trim());
  if (!q) return [{ text, hit: false }];
  // Posição do casamento no texto dobrado, convertida de volta para índices de caractere.
  const joined = folded.join('');
  const at = joined.indexOf(q);
  if (at < 0) return [{ text, hit: false }];
  let pos = 0;
  let start = -1;
  let end = -1;
  for (let i = 0; i < folded.length; i++) {
    if (start < 0 && pos >= at) start = i;
    pos += folded[i]!.length;
    if (start >= 0 && pos >= at + q.length) {
      end = i + 1;
      break;
    }
  }
  const parts = [
    { text: chars.slice(0, start).join(''), hit: false },
    { text: chars.slice(start, end).join(''), hit: true },
    { text: chars.slice(end).join(''), hit: false },
  ];
  return parts.filter((p) => p.text.length > 0);
}

/** Próxima opção ativa com as setas (dá a volta); -1 sem opções. */
export function moveActive(index: number, count: number, dir: 'up' | 'down'): number {
  if (count <= 0) return -1;
  if (index < 0) return dir === 'down' ? 0 : count - 1;
  return dir === 'down' ? (index + 1) % count : (index - 1 + count) % count;
}

export function typesForKind(kind: AssetKind): MarketType[] {
  return kind === 'stocks' ? ['stock'] : kind === 'reits' ? ['reit'] : kind === 'crypto' ? ['crypto'] : [];
}

export function kindForMarketType(type: MarketType): AssetKind {
  return type === 'stock' ? 'stocks' : type === 'reit' ? 'reits' : 'crypto';
}

/** Centavos de `qty` (× 10⁸) ao preço `priceE8`; null sem um dos dois. */
export function totalAtPrice(qty: number | null, priceE8: number | null): number | null {
  if (qty === null || priceE8 === null || qty <= 0 || priceE8 <= 0) return null;
  return unitsValue(qty, priceE8);
}
