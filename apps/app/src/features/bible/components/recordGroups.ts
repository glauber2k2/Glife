// Período de um registro na tela Registros.
export type RecordBucket = 'Hoje' | 'Ontem' | 'Esta semana' | 'Antes';
export const RECORD_BUCKETS: readonly RecordBucket[] = ['Hoje', 'Ontem', 'Esta semana', 'Antes'];

const DAY_MS = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function recordBucket(iso: string, now: Date = new Date()): RecordBucket {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / DAY_MS);
  if (days <= 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return 'Esta semana';
  return 'Antes';
}
