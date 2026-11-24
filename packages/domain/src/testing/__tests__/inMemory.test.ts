import { linksRepositoryContract, notesRepositoryContract, tagsRepositoryContract } from '../index.ts';
import { createInMemoryLinks, createInMemoryNotes, createInMemoryTags } from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';

notesRepositoryContract('memória', async () => ({ ...createInMemoryNotes(USER), userId: USER }));
linksRepositoryContract('memória', async () => ({ links: createInMemoryLinks(USER), userId: USER }));
tagsRepositoryContract('memória', async () => ({ tags: createInMemoryTags(USER), userId: USER }));

import { createInMemoryFinance, financeRepositoryContract } from '../index.ts';

financeRepositoryContract('memória', async () => ({ finance: createInMemoryFinance(USER), userId: USER }));

import { financeReviewContract } from '../index.ts';

financeReviewContract('memória', async () => ({ finance: createInMemoryFinance(USER), userId: USER }));
