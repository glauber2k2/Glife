import { linksRepositoryContract, notesRepositoryContract, tagsRepositoryContract } from '@glife/domain/testing';

import { createLocalLinksRepository } from '../src/features/links/data/localLinksRepository';
import { createLocalTagsRepository } from '../src/features/links/data/localTagsRepository';
import { linksTables } from '../src/features/links/data/schema';
import { createLocalNoteFoldersRepository, createLocalNotesRepository } from '../src/features/notes/data/localNotesRepository';
import { notesTables } from '../src/features/notes/data/schema';
import { createSqliteLocalDb } from './support/sqliteLocalDb';

const USER = '11110000-0000-4000-8000-000000000001';

// As mesmas suítes que validam a implementação em memória, agora sobre SQLite.
notesRepositoryContract('SQLite local', async () => {
  const db = await createSqliteLocalDb(notesTables);
  return { notes: createLocalNotesRepository(db, USER), folders: createLocalNoteFoldersRepository(db, USER), userId: USER };
});

linksRepositoryContract('SQLite local', async () => {
  const db = await createSqliteLocalDb(linksTables);
  return { links: createLocalLinksRepository(db, USER), userId: USER };
});

tagsRepositoryContract('SQLite local', async () => {
  const db = await createSqliteLocalDb(linksTables);
  return { tags: createLocalTagsRepository(db, USER), userId: USER };
});

import { financeRepositoryContract } from '@glife/domain/testing';

import { createLocalFinance } from '../src/features/finance/data/localFinanceStore';
import { financeTables } from '../src/features/finance/data/schema';

financeRepositoryContract('SQLite local', async () => {
  const db = await createSqliteLocalDb(financeTables);
  return { finance: createLocalFinance(db, USER), userId: USER };
});

import { financeReviewContract } from '@glife/domain/testing';

financeReviewContract('SQLite local', async () => {
  const db = await createSqliteLocalDb(financeTables);
  return { finance: createLocalFinance(db, USER), userId: USER };
});

import { shoppingRepositoryContract } from '@glife/domain/testing';

shoppingRepositoryContract('SQLite local', async () => {
  const db = await createSqliteLocalDb(financeTables);
  return { finance: createLocalFinance(db, USER), userId: USER };
});
