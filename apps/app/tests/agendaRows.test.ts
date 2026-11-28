import { describe, expect, it } from 'vitest';

import { sortRows, type Row } from '../src/features/agenda/components/rows';

const row = (title: string, date: string, time: string | null, done = false): Row => ({
  key: title,
  item: { kind: 'reminder', id: title, date, time, end_time: null, title, location: null, done },
});

describe('sortRows', () => {
  it('pendentes primeiro, do mais próximo ao mais longe; feitos no fim, na mesma ordem', () => {
    const rows = [
      row('feito cedo', '2026-11-27', '07:00', true),
      row('tarde', '2026-11-27', '18:00'),
      row('atrasado', '2026-11-25', '10:00'),
      row('feito tarde', '2026-11-27', '20:00', true),
      row('manhã', '2026-11-27', '09:00'),
      row('dia todo', '2026-11-27', null),
    ];
    expect(sortRows(rows).map((r) => r.key)).toEqual(['atrasado', 'dia todo', 'manhã', 'tarde', 'feito cedo', 'feito tarde']);
  });
});
