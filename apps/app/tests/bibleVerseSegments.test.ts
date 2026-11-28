import { describe, expect, it } from 'vitest';

import { verseSegments } from '../src/features/bible/components/verseSegments';

describe('verseSegments', () => {
  it('texto sem referência é um trecho só', () => {
    expect(verseSegments('No princípio era a Palavra.')).toEqual([{ text: 'No princípio era a Palavra.' }]);
  });

  it('referências viram trechos com o endereço do versículo', () => {
    expect(verseSegments('digno do seu salário”. Lucas 10:7; Levítico 19:13')).toEqual([
      { text: 'digno do seu salário”. ' },
      { text: 'Lucas 10:7', href: '/biblia/LUK/10?v=7', label: 'Lucas 10:7' },
      { text: '; ' },
      { text: 'Levítico 19:13', href: '/biblia/LEV/19?v=13', label: 'Levítico 19:13' },
    ]);
  });
});
