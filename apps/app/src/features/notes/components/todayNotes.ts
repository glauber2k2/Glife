import type { Note } from '@glife/domain/notes';

/** Recentes que sempre cabem no bloco, mesmo com muitas fixadas. */
const MIN_RECENT = 2;

/** Notas do bloco da tela Hoje: fixadas primeiro, depois as recentes, sem repetir, até `limit`. */
export function pickTodayNotes(pinned: Note[], recent: Note[], limit: number): Note[] {
  const pinnedIds = new Set(pinned.map((n) => n.id));
  const others = recent.filter((n) => !pinnedIds.has(n.id));
  const pinnedSlots = Math.min(pinned.length, limit - Math.min(MIN_RECENT, others.length));
  return [...pinned.slice(0, pinnedSlots), ...others].slice(0, limit);
}
