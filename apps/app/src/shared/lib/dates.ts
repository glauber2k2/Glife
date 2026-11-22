const fmtLongDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

/** "sábado, 22 de novembro" */
export function longDate(d: Date = new Date()): string {
  return fmtLongDate.format(d);
}
