import { describe, expect, it } from 'vitest';

import { buildFeed, relativeTime, type AppNotification } from '../index.ts';

// Datas locais (o feed agrupa pelo dia do aparelho).
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const now = at(26, 10, 0);

const n = (id: string, when: Date, extra: Partial<AppNotification> = {}): AppNotification => ({
  id,
  module: 'agenda',
  title: id,
  message: '',
  at: when,
  ...extra,
});

describe('notificações: feed', () => {
  it('agrupa em Hoje, Ontem e Antes; grupos vazios não aparecem', () => {
    const feed = buildFeed([n('a', at(26, 9)), n('b', at(25, 18)), n('c', at(20, 8))], null, now);
    expect(feed.groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ['Hoje', ['a']],
      ['Ontem', ['b']],
      ['Antes', ['c']],
    ]);
    expect(buildFeed([n('a', at(26, 9))], null, now).groups.map((g) => g.label)).toEqual(['Hoje']);
  });

  it('o que ainda vai acontecer hoje entra em Hoje, depois do que já passou', () => {
    const feed = buildFeed([n('depois', at(26, 16)), n('antes', at(26, 8)), n('agora', at(26, 9, 48))], null, now);
    expect(feed.groups[0]!.items.map((i) => i.id)).toEqual(['agora', 'antes', 'depois']);
  });

  it('não lido: já aconteceu e depois do "visto até"; o futuro nunca conta', () => {
    const feed = buildFeed([n('velho', at(26, 7)), n('novo', at(26, 9)), n('futuro', at(26, 16))], at(26, 8), now);
    const unread = Object.fromEntries(feed.groups.flatMap((g) => g.items).map((i) => [i.id, i.unread]));
    expect(unread).toEqual({ velho: false, novo: true, futuro: false });
    expect(feed.unread).toBe(1);
  });

  it('sem "visto até", tudo o que já aconteceu é novo', () => {
    expect(buildFeed([n('a', at(26, 7)), n('b', at(24, 7))], null, now).unread).toBe(2);
  });

  it('descarta o que tem mais de 30 dias', () => {
    const feed = buildFeed([n('ok', new Date(2026, 9, 28, 12)), n('velho', new Date(2026, 9, 26, 9))], null, now);
    expect(feed.groups.flatMap((g) => g.items).map((i) => i.id)).toEqual(['ok']);
  });

  it('id repetido entra uma vez só', () => {
    expect(buildFeed([n('a', at(26, 7)), n('a', at(26, 8))], null, now).groups[0]!.items).toHaveLength(1);
  });
});

describe('notificações: quando', () => {
  it('relativo em Hoje, com hora em Ontem e data antes disso', () => {
    expect(relativeTime(at(26, 9, 59), now)).toBe('Agora');
    expect(relativeTime(at(26, 9, 48), now)).toBe('Há 12 min');
    expect(relativeTime(at(26, 8, 50), now)).toBe('Há 1 h');
    expect(relativeTime(at(26, 16), now)).toBe('Daqui a 6 h');
    expect(relativeTime(at(26, 10, 20), now)).toBe('Daqui a 20 min');
    expect(relativeTime(at(25, 18), now)).toBe('Ontem, 18:00');
    expect(relativeTime(at(24, 7, 5), now)).toBe('24/11, 07:05');
  });
});
