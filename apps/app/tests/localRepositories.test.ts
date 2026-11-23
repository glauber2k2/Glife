import { linksRepositoryContract, notesRepositoryContract } from '@glife/domain/testing';

import { createLocalLinksRepository } from '../src/features/links/data/localLinksRepository';
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
