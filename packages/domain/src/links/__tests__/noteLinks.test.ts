import { describe, expect, it } from 'vitest';

import { linkedNoteIds, noteLinkChange, type LinkRow } from '../index.ts';

const N1 = 'aaaa0000-0000-4000-8000-000000000001';
const N2 = 'aaaa0000-0000-4000-8000-000000000002';
const N3 = 'aaaa0000-0000-4000-8000-000000000003';
const row = (id: string, target_ref: string, extra: Partial<LinkRow> = {}): LinkRow => ({
  id,
  source_type: 'reminder',
  source_id: 'bbbb0000-0000-4000-8000-000000000001',
  target_type: 'note',
  target_ref,
  relation: 'about',
  origin: 'manual',
  deleted_at: null,
  ...extra,
});

describe('notas vinculadas a um item', () => {
  it('lista só os vínculos de nota feitos à mão, sem repetir', () => {
    const links = [row('l1', N1), row('l2', N2, { origin: 'markdown' }), row('l3', N3, { relation: 'ref' }), row('l4', N1.toUpperCase()), row('l5', N2, { deleted_at: '2026-11-27T00:00:00Z' })];
    expect(linkedNoteIds(links)).toEqual([N1]);
  });

  it('diz o que gravar e o que apagar para ficar igual à escolha', () => {
    const existing = [row('l1', N1), row('l2', N2), row('l9', N3, { origin: 'markdown' })];
    expect(noteLinkChange(existing, [N2, N3])).toEqual({
      add: [{ target_type: 'note', target_ref: N3, relation: 'about' }],
      remove: ['l1'],
    });
    expect(noteLinkChange(existing, [N1, N2])).toEqual({ add: [], remove: [] });
  });
});
