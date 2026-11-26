import { createInMemoryTags } from '@glife/domain/testing';
import { describe, expect, it } from 'vitest';

import { liveTagCounts } from '../src/features/links/hooks/TaggedItems';

const USER = '11110000-0000-4000-8000-000000000001';
const NOTE_LIVE = { type: 'note' as const, id: '9f2c0000-0000-4000-8000-00000000000a' };
const NOTE_TRASHED = { type: 'note' as const, id: '9f2c0000-0000-4000-8000-00000000000b' };
const EVENT = { type: 'event' as const, id: '9f2c0000-0000-4000-8000-00000000000c' };

describe('contagem das tags só com itens vivos', () => {
  it('descarta o que a fonte do tipo diz que não existe mais; tipo sem fonte fica como está', async () => {
    const tags = createInMemoryTags(USER);
    await tags.add(NOTE_LIVE, 'casa');
    await tags.add(NOTE_TRASHED, 'casa');
    await tags.add(EVENT, 'casa');
    await tags.add(NOTE_TRASHED, 'velha');
    const notes = { type: 'note' as const, alive: async (ids: readonly string[]) => ids.filter((id) => id === NOTE_LIVE.id) };
    const rows = await liveTagCounts(await tags.listWithCounts(), tags, [notes]);
    expect(rows.map((r) => [r.tag.name, r.counts])).toEqual([
      ['casa', { note: 1, event: 1 }],
      ['velha', {}],
    ]);
  });
});
