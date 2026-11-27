import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import { USER_A, USER_B, asUser, createDatabase } from './harness';

let db: PGlite;

beforeAll(async () => {
  db = await createDatabase();
  await db.query(`insert into public.bible_highlights (user_id, ref, color, style) values ($1, 'JHN.3.16', 'yellow', 'highlight')`, [USER_B]);
}, 60_000);

const asA = (sql: string) => asUser(db, USER_A, (tx) => tx.query(sql));

describe('marcações da Bíblia: isolamento e regras do banco', () => {
  it('A não enxerga nem altera as marcações de B', async () => {
    const r = await asUser(db, USER_A, (tx) => tx.query<{ n: number }>('select count(*) as n from public.bible_highlights'));
    expect(Number(r.rows[0]!.n)).toBe(0);
    const u = await asUser(db, USER_A, (tx) => tx.query(`update public.bible_highlights set color = 'pink'`));
    expect(u.affectedRows ?? 0).toBe(0);
  });

  it('A grifa o mesmo versículo duas vezes (cópias de aparelhos offline são aceitas)', async () => {
    const r = await asUser(db, USER_A, async (tx) => {
      await tx.query(`insert into public.bible_highlights (ref, color, style) values ('JHN.3.16', 'blue', 'underline'), ('JHN.3.16', 'green', 'highlight')`);
      return tx.query<{ n: number }>('select count(*) as n from public.bible_highlights');
    });
    expect(Number(r.rows[0]!.n)).toBe(2);
  });

  it('o banco recusa cor, estilo, referência e trecho inválidos', async () => {
    await expect(asA(`insert into public.bible_highlights (ref, color, style) values ('JHN.3.16', 'red', 'highlight')`)).rejects.toThrow();
    await expect(asA(`insert into public.bible_highlights (ref, color, style) values ('JHN.3.16', 'yellow', 'bold')`)).rejects.toThrow();
    await expect(asA(`insert into public.bible_highlights (ref, color, style) values ('JHN.3', 'yellow', 'highlight')`)).rejects.toThrow();
    await expect(asA(`insert into public.bible_highlights (ref, color, style) values ('JHN.3.16-18', 'yellow', 'highlight')`)).rejects.toThrow();
    await expect(asA(`insert into public.bible_highlights (ref, color, style, char_start) values ('JHN.3.16', 'yellow', 'highlight', 2)`)).rejects.toThrow();
    await expect(
      asA(`insert into public.bible_highlights (ref, color, style, char_start, char_end) values ('JHN.3.16', 'yellow', 'highlight', 5, 2)`),
    ).rejects.toThrow();
  });
});
