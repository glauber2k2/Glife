import { describe, expect, it } from 'vitest';

import { noteExcerpt } from '../src/features/notes/components/excerpt';

describe('resumo da nota na lista', () => {
  it('tira marcação de markdown e junta as linhas', () => {
    expect(noteExcerpt('# Título\n\n- item **forte**\n> citação com [[Outra nota]] e [link](https://x.y)')).toBe(
      'Título item forte citação com Outra nota e link',
    );
  });

  it('corta textos longos com reticências', () => {
    const out = noteExcerpt('palavra '.repeat(60), 40);
    expect(out.length).toBeLessThanOrEqual(41);
    expect(out.endsWith('…')).toBe(true);
  });

  it('vazio continua vazio', () => {
    expect(noteExcerpt('  \n ')).toBe('');
  });
});
