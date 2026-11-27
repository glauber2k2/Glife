import { describe, expect, it } from 'vitest';
import { buildRecords, type BibleHighlight } from '../index.ts';

const hl = (id: string, ref: string, color: BibleHighlight['color'], style: BibleHighlight['style'], updated_at: string): BibleHighlight =>
  ({ id, user_id: 'u', ref, color, style, char_start: null, char_end: null, created_at: updated_at, updated_at, deleted_at: null }) as BibleHighlight;

describe('registros da Bíblia (grifos, sublinhados e anotações)', () => {
  it('versículos seguidos com a mesma marca no mesmo minuto viram um registro', () => {
    const r = buildRecords(
      [hl('a', 'PSA.23.2', 'yellow', 'highlight', '2026-11-27T10:00:05Z'), hl('b', 'PSA.23.3', 'yellow', 'highlight', '2026-11-27T10:00:40Z')],
      [],
    );
    expect(r).toEqual([{ kind: 'highlight', id: 'a', book: 'PSA', chapter: 23, verses: [2, 3], color: 'yellow', at: '2026-11-27T10:00:40Z' }]);
  });

  it('cor diferente, outro minuto ou versículo não seguido separam os registros', () => {
    const at = '2026-11-27T10:00:00Z';
    expect(buildRecords([hl('a', 'PSA.23.2', 'yellow', 'highlight', at), hl('b', 'PSA.23.3', 'green', 'highlight', at)], [])).toHaveLength(2);
    expect(buildRecords([hl('a', 'PSA.23.2', 'yellow', 'highlight', at), hl('b', 'PSA.23.3', 'yellow', 'highlight', '2026-11-27T10:01:00Z')], [])).toHaveLength(2);
    expect(buildRecords([hl('a', 'PSA.23.2', 'yellow', 'highlight', at), hl('b', 'PSA.23.4', 'yellow', 'highlight', at)], [])).toHaveLength(2);
    expect(buildRecords([hl('a', 'PSA.23.2', 'blue', 'underline', at)], [])[0]).toMatchObject({ kind: 'underline', verses: [2] });
  });

  it('nota ligada a vários trechos vira um registro só, com o primeiro trecho e quantos mais', () => {
    const r = buildRecords([], [{ id: 'n1', title: 'Semanas difíceis', href: '/nota/n1', updatedAt: '2026-11-27T09:00:00Z', refs: ['PSA.23.4', 'ROM.8.28'] }]);
    expect(r).toEqual([{ kind: 'note', id: 'n1', ref: 'PSA.23.4', extra: 1, title: 'Semanas difíceis', href: '/nota/n1', at: '2026-11-27T09:00:00Z' }]);
  });

  it('tudo junto, do mais recente ao mais antigo', () => {
    const r = buildRecords(
      [hl('a', 'ROM.8.28', 'blue', 'underline', '2026-11-26T08:00:00Z')],
      [{ id: 'n1', title: 'Nota', href: '/nota/n1', updatedAt: '2026-11-27T09:00:00Z', refs: ['JHN.3.16'] }],
    );
    expect(r.map((x) => x.id)).toEqual(['n1', 'a']);
  });
});
