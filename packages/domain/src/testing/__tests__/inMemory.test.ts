import { linksRepositoryContract, notesRepositoryContract } from '../index.ts';
import { createInMemoryLinks, createInMemoryNotes } from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';

notesRepositoryContract('memória', async () => ({ ...createInMemoryNotes(USER), userId: USER }));
linksRepositoryContract('memória', async () => ({ links: createInMemoryLinks(USER), userId: USER }));
