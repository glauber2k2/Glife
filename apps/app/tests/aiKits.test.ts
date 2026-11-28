import { AGENDA_TABLES, createAgendaRepository, type AgendaRows } from '@glife/domain/agenda';
import { AI_TOOLS, createAliasBook, type AiExecContext, type AiToolKit } from '@glife/domain/ai';
import { createInMemoryNotes, createMemoryRowStore } from '@glife/domain/testing';
import { describe, expect, it } from 'vitest';

import { mergeKits } from '@/features/ai/AiToolsProvider';
import { createAgendaAiKit } from '@/features/agenda/ai/agendaAiKit';
import { createNotesAiKit } from '@/features/notes/ai/notesAiKit';

const USER = '00000000-0000-4000-8000-00000000000a';
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function setup() {
  const { notes, folders } = createInMemoryNotes(USER);
  const agenda = createAgendaRepository(createMemoryRowStore<AgendaRows>(AGENDA_TABLES, USER), USER);
  const kit = mergeKits([createNotesAiKit(notes, folders), createAgendaAiKit(agenda)]);
  const ctx: AiExecContext = { aliases: createAliasBook(), today: '2026-11-27' };
  const run = (kitArg: AiToolKit, name: string, input: unknown) => kitArg.executors[name]!(input, ctx);
  return { notes, agenda, kit, ctx, run };
}

describe('kits de ferramentas da IA', () => {
  it('toda ferramenta do registro tem executor', () => {
    const { kit } = setup();
    for (const t of AI_TOOLS) expect(kit.executors[t.name], t.name).toBeTypeOf('function');
  });

  it('cria nota repondo o telefone escondido e devolve só o apelido', async () => {
    const { kit, ctx, run, notes } = setup();
    const masked = ctx.aliases.mask('Ligar 11 98765-4321');
    const r = await run(kit, 'notes_create', { title: masked });
    expect(r.output).toEqual({ note: 'n1' });
    const saved = (await notes.list()).items[0]!;
    expect(saved.title).toBe('Ligar 11 98765-4321');
    expect(r.touches).toEqual([{ entity: 'note', id: saved.id, kind: 'create', before: null }]);
  });

  it('buscar nota devolve apelidos e texto mascarado, sem ids reais', async () => {
    const { kit, run, notes } = setup();
    await notes.create({ title: 'Contatos', body_md: 'João 11 98765-4321' });
    const r = await run(kit, 'notes_search', { query: 'Contatos' });
    const out = JSON.stringify(r.output);
    expect(out).toContain('"note":"n1"');
    expect(out).not.toMatch(UUID);
    expect(out).not.toContain('98765-4321');
  });

  it('ler nota com wikilink não manda o id interno e regravar repõe o link', async () => {
    const { kit, run, notes, ctx } = setup();
    const body = 'Pago em [[transaction:0b9e1a52-8c39-4a0e-9d58-2f0c3b2f8a11]]';
    const n = await notes.create({ title: 'Conta de luz', body_md: body });
    ctx.aliases.alias('note', n.id);
    const r = await run(kit, 'notes_get', { note: 'n1' });
    const out = JSON.stringify(r.output);
    expect(out).not.toMatch(UUID);
    const masked = (r.output as { body_md: string }).body_md;
    await run(kit, 'notes_update', { note: 'n1', body_md: `${masked} (ok)` });
    expect((await notes.get(n.id))!.body_md).toBe(`${body} (ok)`);
  });

  it('editar nota guarda só os campos mudados e desfazer volta o título', async () => {
    const { kit, run, notes, ctx } = setup();
    const n = await notes.create({ title: 'Antigo', body_md: 'texto' });
    ctx.aliases.alias('note', n.id);
    const r = await run(kit, 'notes_update', { note: 'n1', title: 'Novo' });
    expect(r.touches).toEqual([{ entity: 'note', id: n.id, kind: 'update', before: { title: 'Antigo' }, version: expect.any(String) }]);
    expect((await notes.get(n.id))!.title).toBe('Novo');
    await kit.undo.note!(r.touches[0]!);
    expect((await notes.get(n.id))!.title).toBe('Antigo');
  });

  it('lixeira de notas e desfazer restauram', async () => {
    const { kit, run, notes, ctx } = setup();
    const n = await notes.create({ title: 'Velha' });
    ctx.aliases.alias('note', n.id);
    const r = await run(kit, 'notes_trash', { notes: ['n1'] });
    expect(await notes.get(n.id)).toBeNull();
    await kit.undo.note!(r.touches[0]!);
    expect((await notes.get(n.id))!.title).toBe('Velha');
  });

  it('desfazer uma criação manda para a lixeira', async () => {
    const { kit, run, notes } = setup();
    const r = await run(kit, 'notes_create', { title: 'Temporária' });
    await kit.undo.note!(r.touches[0]!);
    expect((await notes.list()).items).toHaveLength(0);
  });

  it('lembrete criado aparece na agenda com apelido, sem UUID', async () => {
    const { kit, run } = setup();
    const c = await run(kit, 'reminder_create', { title: 'Comprar café', start_date: '2026-11-28', time: '09:00' });
    expect(c.output).toEqual({ reminder: 'r1' });
    expect(c.summary).toMatch(/Comprar café/);
    const l = await run(kit, 'agenda_list', { from: '2026-11-28', to: '2026-11-28' });
    const out = JSON.stringify(l.output);
    expect(out).toContain('"reminder":"r1"');
    expect(out).toContain('Comprar café');
    expect(out).not.toMatch(UUID);
  });

  it('evento: criar, editar, lixeira e desfazer', async () => {
    const { kit, run, agenda } = setup();
    const c = await run(kit, 'event_create', { title: 'Dentista', start_date: '2026-12-02', start_time: '14:30' });
    expect(c.output).toEqual({ event: 'e1' });
    const id = c.touches[0]!.id;
    const u = await run(kit, 'event_update', { event: 'e1', start_time: '15:00' });
    expect(u.touches[0]!.before).toEqual({ start_time: '14:30' });
    expect((await agenda.getEvent(id)).start_time).toBe('15:00');
    const t = await run(kit, 'event_trash', { event: 'e1' });
    expect((await agenda.snapshot()).events).toHaveLength(0);
    await kit.undo.event!(t.touches[0]!);
    expect((await agenda.snapshot()).events).toHaveLength(1);
  });

  it('concluir lembrete e desfazer', async () => {
    const { kit, run, agenda } = setup();
    const c = await run(kit, 'reminder_create', { title: 'Remédio', start_date: '2026-11-27', time: '08:00' });
    const done = await run(kit, 'reminder_complete', { reminder: 'r1', date: '2026-11-27' });
    expect((await agenda.getReminder(c.touches[0]!.id)).done_at).not.toBeNull();
    await kit.undo.reminder!(done.touches[0]!);
    expect((await agenda.getReminder(c.touches[0]!.id)).done_at).toBeNull();
  });

  it('pré-visualização da lixeira cita o título', async () => {
    const { kit, notes, ctx } = setup();
    const n = await notes.create({ title: 'Compras do mês' });
    ctx.aliases.alias('note', n.id);
    expect(await kit.preview!.notes_trash!({ notes: ['n1'] }, ctx)).toMatch(/Compras do mês/);
  });
});

describe('desfazer seguro', () => {
  it('lixeira de várias notas volta toda junto ou nada volta', async () => {
    const { kit, run, notes, ctx } = setup();
    const a = await notes.create({ title: 'A' });
    const b = await notes.create({ title: 'B' });
    ctx.aliases.alias('note', a.id);
    ctx.aliases.alias('note', b.id);
    const r = await run(kit, 'notes_trash', { notes: ['n1', 'n2'] });
    expect(r.touches).toHaveLength(1);
    await notes.deleteForever(b.id);
    await expect(kit.undo.note!(r.touches[0]!)).rejects.toMatchObject({ code: 'not_found' });
    expect(await notes.get(a.id)).toBeNull(); // A continua na lixeira: nada pela metade
  });

  it('desfazer edição não passa por cima do que o usuário mudou depois', async () => {
    const { kit, run, notes, ctx } = setup();
    const n = await notes.create({ title: 'Antigo' });
    ctx.aliases.alias('note', n.id);
    const r = await run(kit, 'notes_update', { note: 'n1', title: 'Da IA' });
    await new Promise((res) => setTimeout(res, 5));
    await notes.update(n.id, { title: 'Do usuário' });
    await expect(kit.undo.note!(r.touches[0]!)).rejects.toThrow(/mudou depois/);
    expect((await notes.get(n.id))!.title).toBe('Do usuário');
  });

  it('desfazer edição de evento também confere se mudou depois', async () => {
    const { kit, run, agenda } = setup();
    const c = await run(kit, 'event_create', { title: 'Dentista', start_date: '2026-12-02', start_time: '14:30' });
    const u = await run(kit, 'event_update', { event: 'e1', start_time: '15:00' });
    await new Promise((res) => setTimeout(res, 5));
    await agenda.updateEvent(c.touches[0]!.id, { location: 'Clínica' });
    await expect(kit.undo.event!(u.touches[0]!)).rejects.toThrow(/mudou depois/);
  });
});
