import { linksRepositoryContract, notesRepositoryContract, tagsRepositoryContract } from '../index.ts';
import { createInMemoryLinks, createInMemoryNotes, createInMemoryTags } from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';

notesRepositoryContract('memória', async () => ({ ...createInMemoryNotes(USER), userId: USER }));
linksRepositoryContract('memória', async () => ({ links: createInMemoryLinks(USER), userId: USER }));
tagsRepositoryContract('memória', async () => ({ tags: createInMemoryTags(USER), userId: USER }));
