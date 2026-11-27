import type { Note } from '@glife/domain/notes';
import { describe, expect, it } from 'vitest';

import { exportFileName, notesToMarkdown } from '../src/features/notes/data/exportMarkdown';
import { bulkPinTarget, commonTagState, nextTagState, selectionKey, selectionLabel, tagChange, toggleId } from '../src/features/notes/hooks/selection';

const note = (over: Partial<Note>): Note => ({
  id: '9f2c0000-0000-4000-8000-00000000000a',
  user_id: '11110000-0000-4000-8000-000000000001',
  title: 'Mercado',
  body_md: 'arroz',
  folder_id: null,
  pinned: false,
  kind: 'note',
  created_at: '2026-11-20T10:00:00.000Z',
  updated_at: '2026-11-20T10:00:00.000Z',
  deleted_at: null,
  ...over,
});

describe('seleção de notas', () => {
  it('rótulo da contagem', () => {
    expect(selectionLabel(0)).toBe('Nenhuma');
    expect(selectionLabel(1)).toBe('1 selecionada');
    expect(selectionLabel(2)).toBe('2 selecionadas');
  });

  it('marca e desmarca um id sem mexer no conjunto anterior', () => {
    const a = new Set(['x']);
    const b = toggleId(a, 'y');
    expect([...b].sort()).toEqual(['x', 'y']);
    expect([...a]).toEqual(['x']);
    expect([...toggleId(b, 'x')]).toEqual(['y']);
  });

  it('fixar: se todas já estão fixadas, desafixa; senão fixa', () => {
    expect(bulkPinTarget([note({ pinned: true }), note({ pinned: false })])).toBe(true);
    expect(bulkPinTarget([note({ pinned: true }), note({ pinned: true })])).toBe(false);
  });

  it('estado de cada tag nas selecionadas: todas, algumas ou nenhuma', () => {
    const tagsOf = new Map([
      ['a', new Set(['t1', 't2'])],
      ['b', new Set(['t1'])],
    ]);
    expect(commonTagState(['a', 'b'], tagsOf, 't1')).toBe('all');
    expect(commonTagState(['a', 'b'], tagsOf, 't2')).toBe('some');
    expect(commonTagState(['a', 'b'], tagsOf, 't3')).toBe('none');
  });
});

describe('tags em lote', () => {
  it('chip de tag que só algumas têm: algumas → todas → nenhuma → algumas', () => {
    expect(nextTagState('some', 'some')).toBe('all');
    expect(nextTagState('some', 'all')).toBe('none');
    expect(nextTagState('some', 'none')).toBe('some');
  });

  it('chip de tag que todas ou nenhuma têm alterna entre os dois', () => {
    expect(nextTagState('all', 'all')).toBe('none');
    expect(nextTagState('all', 'none')).toBe('all');
    expect(nextTagState('none', 'none')).toBe('all');
  });

  it('só grava o que mudou: tirar só quando termina em nenhuma e antes não era', () => {
    const all = [
      { id: 't1', name: 'casa' },
      { id: 't2', name: 'mercado' },
      { id: 't3', name: 'natal' },
      { id: 't4', name: 'treino' },
    ];
    const initial = new Map([['t1', 'some'], ['t2', 'some'], ['t3', 'all'], ['t4', 'none']] as const);
    const wanted = new Map([['t1', 'some'], ['t2', 'none'], ['t3', 'all'], ['t4', 'all']] as const);
    expect(tagChange(all, initial, wanted, ['nova'])).toEqual({ add: ['nova', 'treino'], remove: ['t2'] });
    expect(tagChange(all, initial, initial, [])).toEqual({ add: [], remove: [] });
  });

  it('chave estável da seleção não depende da ordem', () => {
    expect(selectionKey(new Set(['b', 'a']))).toBe(selectionKey(new Set(['a', 'b'])));
  });
});

describe('exportar notas em markdown', () => {
  it('uma nota: título como cabeçalho e o corpo', () => {
    expect(notesToMarkdown([note({ title: 'Mercado', body_md: 'arroz\nfeijão' })])).toBe('# Mercado\n\narroz\nfeijão\n');
  });

  it('várias notas num arquivo só, separadas por linha horizontal; sem título vira "Sem título"', () => {
    const md = notesToMarkdown([note({ title: 'A', body_md: 'um' }), note({ title: '', body_md: 'dois' })]);
    expect(md).toBe('# A\n\num\n\n---\n\n# Sem título\n\ndois\n');
  });

  it('nome do arquivo: título da nota (sem caracteres proibidos) ou notas-data', () => {
    expect(exportFileName([note({ title: 'Lista: Mercado/Casa?' })], '2026-11-26')).toBe('Lista Mercado Casa.md');
    expect(exportFileName([note({ title: '' })], '2026-11-26')).toBe('nota-2026-11-26.md');
    expect(exportFileName([note({}), note({})], '2026-11-26')).toBe('notas-2026-11-26.md');
  });
});
