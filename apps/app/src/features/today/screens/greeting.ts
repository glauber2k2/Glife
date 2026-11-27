/** Bom dia / boa tarde / boa noite pela hora local. */
export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
