import { describe, expect, it } from 'vitest';

import { createLocalFinance } from '../src/features/finance/data/localFinanceStore';
import { financeTables } from '../src/features/finance/data/schema';
import { createSqliteLocalDb } from './support/sqliteLocalDb';

const USER = '11110000-0000-4000-8000-000000000001';

describe('finanças locais: linhas anteriores à migração', () => {
  it('sort_order NULL vira 0 ao ler', async () => {
    const db = await createSqliteLocalDb(financeTables);
    const finance = createLocalFinance(db, USER);
    const a = await finance.accounts.create({ name: 'Itaú', kind: 'checking' });
    const c = await finance.categories.create({ name: 'Mercado', kind: 'expense', color: 'sage', icon: 'shopping-cart' });
    await db.execute('UPDATE accounts SET sort_order = NULL WHERE id = ?', [a.id]);
    await db.execute('UPDATE categories SET sort_order = NULL WHERE id = ?', [c.id]);
    expect((await finance.accounts.get(a.id))!.sort_order).toBe(0);
    expect((await finance.categories.list()).map((x) => x.sort_order)).toEqual([0]);
  });
});
