// Filtro dos registros: Todos · Anotações · Grifos · Sublinhados (com a contagem de cada tipo).
import { SegmentedControl } from '@/shared/ui';

import type { RecordFilter as Filter } from '../hooks/useBibleRecords';

export function RecordFilter({ value, onChange, counts }: { value: Filter; onChange(v: Filter): void; counts: Record<Filter, number> }) {
  const n = (k: Filter) => (counts[k] ? ` ${counts[k]}` : '');
  return (
    <SegmentedControl
      label="Tipo de registro"
      shape="pill"
      fullWidth
      value={value}
      onChange={onChange}
      options={[
        { value: 'all', label: 'Todos' },
        { value: 'note', label: `Anotações${n('note')}` },
        { value: 'highlight', label: `Grifos${n('highlight')}` },
        { value: 'underline', label: `Sublinhados${n('underline')}` },
      ]}
    />
  );
}
