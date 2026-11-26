import type { ScheduledNotice } from '@glife/domain/time';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const os = vi.hoisted(() => ({
  scheduled: new Map<string, { identifier: string; content: { data?: Record<string, unknown> } }>(),
  permission: true,
  schedule: vi.fn(),
  cancel: vi.fn(),
  /** Botões criados (a criação acontece uma vez por módulo; não é limpa entre os testes). */
  buttons: [] as { identifier: string; options: { opensAppToForeground: boolean } }[],
  last: null as unknown,
  responseListener: null as ((r: unknown) => void) | null,
}));

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationHandler: vi.fn(),
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  setNotificationCategoryAsync: async (_id: string, actions: typeof os.buttons) => { os.buttons.push(...actions); },
  addNotificationResponseReceivedListener: (l: (r: unknown) => void) => {
    os.responseListener = l;
    return { remove: () => { os.responseListener = null; } };
  },
  getLastNotificationResponseAsync: async () => os.last,
  clearLastNotificationResponseAsync: vi.fn(async () => { os.last = null; }),
  setNotificationChannelAsync: vi.fn(async () => {}),
  getPermissionsAsync: async () => ({ granted: os.permission, canAskAgain: false }),
  getAllScheduledNotificationsAsync: async () => [...os.scheduled.values()],
  getPresentedNotificationsAsync: async () => [],
  dismissNotificationAsync: vi.fn(async () => {}),
  scheduleNotificationAsync: os.schedule,
  cancelScheduledNotificationAsync: os.cancel,
}));

import { createNoticeScheduler } from '../src/shared/lib/notices/scheduler.native';

const id = '12345678-1234-4234-8234-123456789012';
const notice: ScheduledNotice = { key: `reminder:${id}:2026-11-27`, title: 'Lembrete', body: '', date: '2026-11-27', time: '15:00', url: `/agenda/lembrete/${id}`, ref: { kind: 'reminder', id, date: '2026-11-27' } };
const at = new Date(2026, 10, 27, 16);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 26, 12));
  vi.clearAllMocks();
  os.scheduled.clear();
  os.permission = true;
  os.last = null;
  os.responseListener = null;
  os.schedule.mockImplementation(async (n) => { os.scheduled.set(n.identifier, n); return n.identifier; });
  os.cancel.mockImplementation(async (identifier) => { os.scheduled.delete(identifier); });
});
afterEach(() => vi.useRealTimers());

describe('agendador nativo: adiamento dentro do app', () => {
  it('substitui o horário original e repetir o adiamento não duplica', async () => {
    const scheduler = createNoticeScheduler();
    await scheduler.replaceAll([notice], () => true);
    await expect(scheduler.snooze(notice, at)).resolves.toBe(true);
    await scheduler.snooze(notice, new Date(at.getTime() + 60_000));
    expect([...os.scheduled.keys()]).toEqual([notice.key + ':adiado']);
    expect(os.schedule.mock.lastCall?.[0]).toMatchObject({ trigger: { date: new Date(at.getTime() + 60_000) }, content: { data: { snoozed: true, ref: notice.ref } } });
  });

  it('recalcular a janela mantém o adiamento sem recriar o aviso original', async () => {
    const scheduler = createNoticeScheduler();
    await scheduler.snooze(notice, at);
    await scheduler.replaceAll([notice], () => true);
    expect([...os.scheduled.keys()]).toEqual([notice.key + ':adiado']);
    await scheduler.replaceAll([], () => false);
    expect(os.scheduled.size).toBe(0);
  });

  it('limpar todos espera o adiamento em curso e também o cancela', async () => {
    const scheduler = createNoticeScheduler();
    const snoozing = scheduler.snooze(notice, at);
    const clearing = scheduler.clearAll();
    await Promise.all([snoozing, clearing]);
    expect(os.scheduled.size).toBe(0);
  });

  it('sem permissão não confirma um agendamento que não aconteceu', async () => {
    const scheduler = createNoticeScheduler();
    os.permission = false;
    await expect(scheduler.snooze(notice, at)).resolves.toBe(false);
    expect(os.schedule).not.toHaveBeenCalled();
  });

  it('falha ao substituir desfaz o novo horário e permite tentar de novo', async () => {
    const scheduler = createNoticeScheduler();
    await scheduler.replaceAll([notice], () => true);
    os.cancel.mockRejectedValueOnce(new Error('falha do aparelho'));
    await expect(scheduler.snooze(notice, at)).rejects.toThrow('falha do aparelho');
    expect([...os.scheduled.keys()]).toEqual([notice.key]);
    await expect(scheduler.snooze(notice, at)).resolves.toBe(true);
    expect([...os.scheduled.keys()]).toEqual([notice.key + ':adiado']);
  });
});

/** Resposta do sistema a um botão (ou ao toque) num aviso do Glife. */
const response = (actionIdentifier: string, identifier = notice.key) => ({
  actionIdentifier,
  notification: {
    date: 1,
    request: { identifier, content: { title: 'Lembrete', body: null, categoryIdentifier: 'glife-lembrete', data: { glife: true, url: notice.url, ref: notice.ref } } },
  },
});

describe('agendador nativo: botões do aviso com o app fechado', () => {
  it('todos os botões abrem o app (senão o Android não chama o JS com o app fechado)', async () => {
    const scheduler = createNoticeScheduler();
    await scheduler.replaceAll([notice], () => true);
    const buttons = os.buttons;
    expect(buttons.map((b) => b.identifier).sort()).toEqual(['done', 'log', 'snooze', 'snooze']);
    expect(buttons.every((b) => b.options.opensAppToForeground)).toBe(true);
  });

  it('"Feito" que abriu o app conclui pela leitura de abertura, uma vez só e sem navegar', async () => {
    os.last = response('done');
    const scheduler = createNoticeScheduler();
    const opened = vi.fn();
    const acted = vi.fn();
    scheduler.onOpen(opened);
    scheduler.onAction(acted);
    await vi.waitFor(() => expect(acted).toHaveBeenCalledTimes(1));
    expect(acted).toHaveBeenCalledWith({ action: 'done', notice: notice.ref });
    // A mesma resposta chegando também pelo listener não repete a ação.
    os.responseListener?.(response('done'));
    expect(acted).toHaveBeenCalledTimes(1);
    expect(opened).not.toHaveBeenCalled();
  });

  it('"Adiar" que abriu o app reagenda o aviso daqui a 10 min sem navegar', async () => {
    os.last = response('snooze');
    const start = Date.now();
    const scheduler = createNoticeScheduler();
    const opened = vi.fn();
    scheduler.onOpen(opened);
    scheduler.onAction(() => {});
    await vi.waitFor(() => expect(os.scheduled.has(notice.key + ':adiado')).toBe(true));
    const scheduled = os.schedule.mock.lastCall?.[0] as { trigger: { date: Date }; content: { data: { snoozed: boolean } } };
    expect(scheduled.content.data.snoozed).toBe(true);
    // waitFor anda o relógio falso alguns ms: o adiamento é de 10 min a partir do toque.
    expect(scheduled.trigger.date.getTime() - start).toBeGreaterThanOrEqual(10 * 60_000);
    expect(scheduled.trigger.date.getTime() - start).toBeLessThan(10 * 60_000 + 5_000);
    expect(opened).not.toHaveBeenCalled();
  });
});
