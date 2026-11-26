// Feed da central: agrupa em Hoje/Ontem/Antes pelo dia do aparelho, marca o que é novo (já aconteceu e veio depois
// do "visto até") e descarta o que tem mais de 30 dias. Puro: o relógio e o "visto até" vêm de fora.
import { FEED_MAX_AGE_DAYS, type AppNotification } from './model.ts';

export type FeedGroupLabel = 'Hoje' | 'Ontem' | 'Antes';

export interface FeedItem extends AppNotification {
  unread: boolean;
}

export interface FeedGroup {
  label: FeedGroupLabel;
  items: FeedItem[];
}

export interface Feed {
  groups: FeedGroup[];
  unread: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Dias de calendário entre o dia de `at` e o de `now` (horário de verão não atrapalha). */
const daysAgo = (at: Date, now: Date) => Math.round((startOfDay(now).getTime() - startOfDay(at).getTime()) / DAY_MS);

function groupOf(at: Date, now: Date): FeedGroupLabel {
  const d = daysAgo(at, now);
  return d <= 0 ? 'Hoje' : d === 1 ? 'Ontem' : 'Antes';
}

export function buildFeed(items: readonly AppNotification[], seenUntil: Date | null, now: Date): Feed {
  const oldest = now.getTime() - FEED_MAX_AGE_DAYS * DAY_MS;
  const seen = new Set<string>();
  const kept: FeedItem[] = [];
  for (const n of items) {
    const t = n.at.getTime();
    if (t < oldest || seen.has(n.id)) continue;
    seen.add(n.id);
    kept.push({ ...n, unread: t <= now.getTime() && (seenUntil === null || t > seenUntil.getTime()) });
  }
  // O que já passou, do mais recente ao mais antigo; o que ainda vai acontecer hoje vem depois, o mais próximo antes.
  const past = (n: FeedItem) => n.at.getTime() <= now.getTime();
  kept.sort((a, b) => {
    if (past(a) !== past(b)) return past(a) ? -1 : 1;
    const diff = past(a) ? b.at.getTime() - a.at.getTime() : a.at.getTime() - b.at.getTime();
    return diff || (a.id < b.id ? -1 : 1);
  });
  const groups: FeedGroup[] = (['Hoje', 'Ontem', 'Antes'] as const)
    .map((label) => ({ label, items: kept.filter((n) => groupOf(n.at, now) === label) }))
    .filter((g) => g.items.length > 0);
  return { groups, unread: kept.filter((n) => n.unread).length };
}

const p2 = (n: number) => String(n).padStart(2, '0');
const hm = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}`;

/** "Agora", "Há 12 min", "Daqui a 6 h", "Ontem, 18:00", "24/11, 07:05". */
export function relativeTime(at: Date, now: Date): string {
  const d = daysAgo(at, now);
  if (d === 1) return `Ontem, ${hm(at)}`;
  if (d > 1 || d < 0) return `${p2(at.getDate())}/${p2(at.getMonth() + 1)}, ${hm(at)}`;
  const min = Math.round((now.getTime() - at.getTime()) / 60000);
  if (Math.abs(min) < 2) return 'Agora';
  const text = Math.abs(min) < 60 ? `${Math.abs(min)} min` : `${Math.floor(Math.abs(min) / 60)} h`;
  return min > 0 ? `Há ${text}` : `Daqui a ${text}`;
}
