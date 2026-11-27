import type { Link } from '@glife/domain/links';
import { describe, expect, it, vi } from 'vitest';

vi.mock('lucide-react-native', () => ({}));

import { passageActions, registerPassageAction, type PassageAction } from '../src/features/bible/components/actions';
import { linksByVerse } from '../src/features/bible/components/chapterLinks';
import { bibleHref, neighborChapter } from '../src/features/bible/components/navigation';

const link = (id: string, ref: string, source = 'a'): Link =>
  ({ id, target_type: 'bible', target_ref: ref, source_type: 'note', source_id: source, relation: 'ref', origin: 'markdown', deleted_at: null }) as Link;

describe('vínculos de um capítulo', () => {
  it('separa por versículo e guarda os do capítulo inteiro à parte', () => {
    const r = linksByVerse([link('1', 'JHN.3.16'), link('2', 'JHN.3.16-18'), link('3', 'JHN.3'), link('4', 'JHN.2.1'), link('5', 'JHN.2.25-3.2')], 'JHN', 3, 36);
    expect(r.byVerse.get(16)?.map((l) => l.id)).toEqual(['1', '2']);
    expect(r.byVerse.get(18)?.map((l) => l.id)).toEqual(['2']);
    expect(r.byVerse.get(2)?.map((l) => l.id)).toEqual(['5']);
    expect(r.byVerse.has(3)).toBe(false);
    expect(r.chapter.map((l) => l.id)).toEqual(['3']);
  });

  it('ignora ref inválida e versículo além do fim do capítulo', () => {
    const r = linksByVerse([link('1', 'lixo'), link('2', 'JHN.3.99')], 'JHN', 3, 36);
    expect(r.byVerse.size).toBe(0);
  });

  it('todas as notas do capítulo, sem repetir a mesma nota', () => {
    const r = linksByVerse([link('1', 'JHN.3.16', 'n1'), link('2', 'JHN.3.17', 'n1'), link('3', 'JHN.3', 'n2')], 'JHN', 3, 36);
    expect(r.sourceIds).toEqual(['n1', 'n2']);
  });
});

describe('navegação', () => {
  it('rota do leitor a partir da referência', () => {
    expect(bibleHref('JHN.3.16')).toBe('/biblia/JHN/3?v=16');
    expect(bibleHref('JHN.3.16-18')).toBe('/biblia/JHN/3?v=16');
    expect(bibleHref('PSA.23')).toBe('/biblia/PSA/23');
    expect(bibleHref('lixo')).toBeNull();
  });

  it('capítulo anterior e próximo atravessam livros e param nas pontas', () => {
    expect(neighborChapter('JHN', 3, 1)).toEqual({ book: 'JHN', chapter: 4 });
    expect(neighborChapter('MAL', 4, 1)).toEqual({ book: 'MAT', chapter: 1 });
    expect(neighborChapter('MAT', 1, -1)).toEqual({ book: 'MAL', chapter: 4 });
    expect(neighborChapter('GEN', 1, -1)).toBeNull();
    expect(neighborChapter('REV', 22, 1)).toBeNull();
  });
});

describe('ações do trecho', () => {
  it('registra e filtra por onde a ação vale', () => {
    const a: PassageAction = { id: 'teste-v', label: 'V', icon: (() => null) as never, appliesTo: 'verse', run: () => {} };
    const b: PassageAction = { id: 'teste-b', label: 'B', icon: (() => null) as never, appliesTo: 'both', run: () => {} };
    registerPassageAction(a);
    registerPassageAction(b);
    registerPassageAction(a);
    expect(passageActions('verse').filter((x) => x.id.startsWith('teste')).map((x) => x.id)).toEqual(['teste-v', 'teste-b']);
    expect(passageActions('chapter').filter((x) => x.id.startsWith('teste')).map((x) => x.id)).toEqual(['teste-b']);
  });
});

import { chromeVisibility, letterSpacingPx, readMinutes } from '../src/features/bible/components/readerChrome';

describe('leitor: barras que somem ao rolar', () => {
  it('descer mais de 4 px depois de 80 px esconde; subir ou voltar ao topo mostra', () => {
    expect(chromeVisibility({ prevY: 100, y: 110, visible: true })).toBe(false);
    expect(chromeVisibility({ prevY: 50, y: 70, visible: true })).toBe(true);
    expect(chromeVisibility({ prevY: 300, y: 290, visible: false })).toBe(true);
    expect(chromeVisibility({ prevY: 300, y: 298, visible: false })).toBe(false);
    expect(chromeVisibility({ prevY: 60, y: 30, visible: false })).toBe(true);
  });
});

describe('leitor: medidas do texto', () => {
  it('espaço entre letras em % do tamanho vira px', () => {
    expect(letterSpacingPx(19, 6)).toBeCloseTo(1.14, 5);
    expect(letterSpacingPx(20, -2)).toBeCloseTo(-0.4, 5);
    expect(letterSpacingPx(19, 0)).toBe(0);
  });

  it('minutos de leitura a 190 palavras por minuto, no mínimo 1', () => {
    expect(readMinutes(['palavra '.repeat(380)])).toBe(2);
    expect(readMinutes(['curto'])).toBe(1);
  });
});

import { rangeLabel } from '../src/features/bible/components/passageLabel';

describe('barra de seleção: referência dos versículos escolhidos', () => {
  it('junta versículos seguidos com traço e separa os soltos com vírgula', () => {
    expect(rangeLabel('PSA', 23, [2, 3, 4, 6])).toBe('Salmos 23:2–4, 6');
    expect(rangeLabel('PSA', 23, [5])).toBe('Salmos 23:5');
    expect(rangeLabel('JHN', 3, [17, 16])).toBe('João 3:16–17');
  });
});
