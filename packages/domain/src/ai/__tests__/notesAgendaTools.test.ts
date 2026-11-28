import { describe, expect, it } from 'vitest';

import { AI_TOOLS, findAiTool, needsConfirmation } from '../index.ts';

const NAMES = [
  'notes_search',
  'notes_get',
  'notes_create',
  'notes_update',
  'notes_trash',
  'agenda_list',
  'event_create',
  'event_update',
  'event_trash',
  'reminder_create',
  'reminder_update',
  'reminder_complete',
  'reminder_trash',
];

const tool = (name: string) => {
  const t = findAiTool(name);
  if (!t) throw new Error(`sem ferramenta ${name}`);
  return t;
};

describe('ferramentas de notas e agenda', () => {
  it('estão todas no registro', () => {
    expect(AI_TOOLS.map((t) => t.name).sort()).toEqual([...NAMES].sort());
  });

  it('só mandar para a lixeira pede confirmação', () => {
    const confirm = AI_TOOLS.filter(needsConfirmation).map((t) => t.name).sort();
    expect(confirm).toEqual(['event_trash', 'notes_trash', 'reminder_trash']);
  });

  it('título de nota é de uma linha só', () => {
    expect(tool('notes_create').input.safeParse({ title: 'a\nb' }).success).toBe(false);
    expect(tool('notes_create').input.safeParse({ title: 'Compras' }).success).toBe(true);
  });

  it('editar nota exige ao menos um campo além do apelido', () => {
    expect(tool('notes_update').input.safeParse({ note: 'n1' }).success).toBe(false);
    expect(tool('notes_update').input.safeParse({ note: 'n1', pinned: true }).success).toBe(true);
  });

  it('lixeira de notas aceita de 1 a 20', () => {
    expect(tool('notes_trash').input.safeParse({ notes: [] }).success).toBe(false);
    expect(tool('notes_trash').input.safeParse({ notes: ['n1', 'n2'] }).success).toBe(true);
  });

  it('agenda_list aceita no máximo 62 dias e começo antes do fim', () => {
    expect(tool('agenda_list').input.safeParse({ from: '2026-11-01', to: '2027-02-01' }).success).toBe(false);
    expect(tool('agenda_list').input.safeParse({ from: '2026-11-10', to: '2026-11-01' }).success).toBe(false);
    expect(tool('agenda_list').input.safeParse({ from: '2026-11-01', to: '2026-11-30' }).success).toBe(true);
  });

  it('datas e horas precisam ser concretas', () => {
    expect(tool('reminder_create').input.safeParse({ title: 'Café', start_date: 'amanhã', time: '09:00' }).success).toBe(false);
    expect(tool('reminder_create').input.safeParse({ title: 'Café', start_date: '2026-11-28', time: '9h' }).success).toBe(false);
    expect(tool('reminder_create').input.safeParse({ title: 'Café', start_date: '2026-11-28', time: '09:00' }).success).toBe(true);
    expect(tool('event_create').input.safeParse({ title: 'Dentista', start_date: '2026-12-02', start_time: '14:30' }).success).toBe(true);
  });
});
