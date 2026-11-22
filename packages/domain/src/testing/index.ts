// Ferramentas de teste dos repositórios: suítes de contrato (vitest) e implementações em memória.
// Só para testes — o app de produção nunca importa daqui.
export { createInMemoryLinks, createInMemoryNotes } from './memory.ts';
export { linksRepositoryContract, type LinksContractSubject } from './linksContract.ts';
export { notesRepositoryContract, type NotesContractSubject } from './notesContract.ts';
