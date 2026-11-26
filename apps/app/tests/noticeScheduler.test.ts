import type { ScheduledNotice } from '@glife/domain/time';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const os = vi.hoisted(() => ({
  scheduled: new Map<string, { identifier: string; content: { data?: Record<string, unknown> } }>(),
  permission: true,
  schedule: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationHandler: vi.fn(),
  setNotificationCategoryAsync: vi.fn(async () => {}),
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
