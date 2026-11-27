import type { Note } from '@glife/domain/notes';
import { describe, expect, it } from 'vitest';

import { pickTodayNotes } from '../src/features/notes/components/todayNotes';
import { shouldReplayEntrance } from '../src/features/today/entrance';
import { relativeDay } from '../src/shared/lib/dates';

// Datas em horário local, para o teste não depender do fuso da máquina.
const now = new Date(2026, 10, 23, 15, 0);
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m, d, h, 0).toISOString();

describe('relativeDay', () => {
  it('hoje, ontem e há N dias na última semana', () => {
    expect(relativeDay(at(2026, 10, 23, 8), now)).toBe('hoje');
    expect(relativeDay(at(2026, 10, 22, 23), now)).toBe('ontem');
    expect(relativeDay(at(2026, 10, 21), now)).toBe('há 2 dias');
    expect(relativeDay(at(2026, 10, 17), now)).toBe('há 6 dias');
  });

  it('mais antigo: dia e mês abreviado; outro ano leva o ano', () => {
    expect(relativeDay(at(2026, 10, 12), now)).toBe('12 nov');
    expect(relativeDay(at(2025, 0, 5), now)).toBe('5 jan 2025');
  });
});

const note = (id: string, pinned = false): Note => ({
  id,
  user_id: 'u',
  title: id,
  body_md: '',
  folder_id: null,
  pinned,
  created_at: at(2026, 10, 1),
  updated_at: at(2026, 10, 1),
  deleted_at: null,
});

describe('pickTodayNotes', () => {
  it('fixadas primeiro, depois as recentes, sem repetir e até o limite', () => {
    const pinned = [note('a', true), note('b', true)];
    const recent = [note('c'), note('a', true), note('d'), note('e'), note('f')];
    expect(pickTodayNotes(pinned, recent, 5).map((n) => n.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('muitas fixadas ainda deixam espaço para 2 recentes', () => {
    const pinned = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => note(id, true));
    expect(pickTodayNotes(pinned, [note('r1'), note('r2')], 5).map((n) => n.id)).toEqual(['p1', 'p2', 'p3', 'r1', 'r2']);
  });
});

describe('shouldReplayEntrance', () => {
  const min = 60_000;
  it('repete a cascata ao voltar depois de 30 min fora', () => {
    expect(shouldReplayEntrance(0, 30 * min)).toBe(true);
    expect(shouldReplayEntrance(0, 29 * min)).toBe(false);
  });

  it('sem saída registrada não repete', () => {
    expect(shouldReplayEntrance(null, 99 * min)).toBe(false);
  });
});

describe('greeting', () => {
  it('bom dia de manhã, boa tarde à tarde e boa noite no resto', async () => {
    const { greeting } = await import('../src/features/today/screens/greeting');
    expect(greeting(5)).toBe('Bom dia');
    expect(greeting(11)).toBe('Bom dia');
    expect(greeting(12)).toBe('Boa tarde');
    expect(greeting(17)).toBe('Boa tarde');
    expect(greeting(18)).toBe('Boa noite');
    expect(greeting(2)).toBe('Boa noite');
  });
});
