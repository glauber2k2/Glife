// Web: o navegador não agenda avisos com o app fechado; o agendador não faz nada.
import type { NoticeScheduler } from './types';

export function createNoticeScheduler(): NoticeScheduler {
  return { replaceAll: async () => {}, onOpen: () => () => {}, onAction: () => () => {} };
}
