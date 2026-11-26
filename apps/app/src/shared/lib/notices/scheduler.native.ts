// Android/iOS: avisos locais (funcionam offline) com expo-notifications. Cada aparelho agenda os seus; nada disso
// sincroniza. Os avisos do Glife levam `data.glife` para não mexer em outros que existam. Lembrete e refeição trazem
// botões (categorias): "Feito"/"Registrar" e "Adiar" (+10 min, reagendado aqui mesmo).
import { localNow, type NoticeRef, type ScheduledNotice } from '@glife/domain/time';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { SAFE_NOTICE_ROUTES, parseNoticeRef, staleNotices, type NoticeAction, type NoticeActionEvent, type NoticeScheduler } from './types';

const CHANNEL = 'lembretes';
const SNOOZE_MINUTES = 10;
const SNOOZED = ':adiado';
const CATEGORY = { reminder: 'glife-lembrete', meal: 'glife-refeicao' } as const;
const ACTIONS: readonly NoticeAction[] = ['done', 'snooze', 'log'];

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let categoriesReady: Promise<void> | null = null;
/** Botões dos avisos. "Feito" e "Adiar" resolvem sem trazer o app para a frente (onde o sistema permite). */
function ensureCategories(): Promise<void> {
  categoriesReady ??= Promise.all([
    Notifications.setNotificationCategoryAsync(CATEGORY.reminder, [
      { identifier: 'done', buttonTitle: 'Feito', options: { opensAppToForeground: false } },
      { identifier: 'snooze', buttonTitle: 'Adiar', options: { opensAppToForeground: false } },
    ]),
    Notifications.setNotificationCategoryAsync(CATEGORY.meal, [
      { identifier: 'log', buttonTitle: 'Registrar', options: { opensAppToForeground: true } },
      { identifier: 'snooze', buttonTitle: 'Adiar', options: { opensAppToForeground: false } },
    ]),
  ]).then(
    () => undefined,
    (e) => {
      categoriesReady = null;
      console.warn('Falha ao criar os botões dos avisos', e);
    },
  );
  return categoriesReady;
}

async function ready(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // AndroidImportance vem por reexportação que o plugin de import não segue (o tsc confere o tipo).
    // eslint-disable-next-line import/namespace
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Lembretes', importance: Notifications.AndroidImportance.HIGH });
  }
  await ensureCategories();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** "AAAA-MM-DD" + "HH:MM" na hora local do aparelho. */
const localDate = (date: string, time: string) =>
  new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), Number(time.slice(0, 2)), Number(time.slice(3, 5)));

const contentOf = (n: ScheduledNotice): Notifications.NotificationContentInput => ({
  title: n.title,
  body: n.body || undefined,
  data: { glife: true, url: n.url, ...(n.ref ? { ref: { ...n.ref } } : {}) },
  ...(n.ref ? { categoryIdentifier: CATEGORY[n.ref.kind] } : {}),
});

export function createNoticeScheduler(): NoticeScheduler {
  let running: Promise<void> = Promise.resolve();
  const openListeners = new Set<(url: string) => void>();
  const actionListeners = new Set<(e: NoticeActionEvent) => void>();
  /** Respostas já tratadas (a última resposta pode chegar pelo listener e pela leitura de abertura). */
  const handled = new Set<string>();
  let sub: { remove(): void } | null = null;

  /** Adiar: o mesmo aviso daqui a 10 min (um só por aviso; adiar de novo substitui). */
  async function snooze(request: Notifications.NotificationRequest) {
    const base = request.identifier.endsWith(SNOOZED) ? request.identifier.slice(0, -SNOOZED.length) : request.identifier;
    const { title, body, data, categoryIdentifier } = request.content;
    await Notifications.scheduleNotificationAsync({
      identifier: base + SNOOZED,
      content: { title: title ?? undefined, body: body ?? undefined, data: { ...data, snoozed: true }, ...(categoryIdentifier ? { categoryIdentifier } : {}) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + SNOOZE_MINUTES * 60_000), channelId: CHANNEL },
    });
  }

  function handle(r: Notifications.NotificationResponse) {
    const request = r.notification.request;
    const key = `${request.identifier}|${r.actionIdentifier}|${r.notification.date}`;
    if (handled.has(key)) return;
    handled.add(key);
    const data = request.content.data;
    if (data?.glife !== true) return;
    if (r.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      const url = data.url;
      if (typeof url === 'string' && SAFE_NOTICE_ROUTES.test(url)) openListeners.forEach((l) => l(url));
      return;
    }
    const action = ACTIONS.find((a) => a === r.actionIdentifier);
    const notice = parseNoticeRef(data.ref);
    if (!action || !notice) return;
    // O aviso some da gaveta; "Feito"/"Registrar" também cancelam um adiamento pendente dele.
    void Notifications.dismissNotificationAsync(request.identifier).catch(() => undefined);
    if (action === 'snooze') void snooze(request).catch((e) => console.warn('Falha ao adiar o aviso', e));
    else {
      const snoozedId = request.identifier.endsWith(SNOOZED) ? request.identifier : request.identifier + SNOOZED;
      void Notifications.cancelScheduledNotificationAsync(snoozedId).catch(() => undefined);
    }
    actionListeners.forEach((l) => l({ action, notice }));
  }

  /** Assina as respostas na primeira escuta e trata a que abriu o app (toque ou botão com o app fechado). */
  function listen() {
    if (sub) return;
    sub = Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (!r) return;
        handle(r);
        return Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => undefined);
  }
  function stopIfIdle() {
    if (openListeners.size === 0 && actionListeners.size === 0) {
      sub?.remove();
      sub = null;
    }
  }

  /** Cancela os avisos do Glife agendados, menos os adiados que `keepSnoozed` mantém. */
  async function cancel(keepSnoozed: (ref: NoticeRef) => boolean) {
    const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).map((n) => ({ identifier: n.identifier, data: n.content.data }));
    await Promise.all(staleNotices(scheduled, keepSnoozed).map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  }

  return {
    // Em fila: duas trocas seguidas não se atropelam.
    replaceAll: (notices, keepSnoozed) => {
      running = running
        .then(async () => {
          // Adiado fica só enquanto o lembrete/refeição dele ainda está pendente (concluído em qualquer lugar, some).
          await cancel(keepSnoozed);
          if (notices.length === 0 || !(await ready())) return;
          const now = localNow();
          for (const n of notices) {
            if (`${n.date}T${n.time}` <= `${now.date}T${now.time}`) continue;
            await Notifications.scheduleNotificationAsync({
              identifier: n.key,
              content: contentOf(n),
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: localDate(n.date, n.time), channelId: CHANNEL },
            });
          }
        })
        .catch((e) => console.warn('Falha ao agendar os avisos', e));
      return running;
    },
    clearAll: () => {
      running = running
        .then(async () => {
          await cancel(() => false);
          const shown = (await Notifications.getPresentedNotificationsAsync()).filter((n) => n.request.content.data?.glife === true);
          await Promise.all(shown.map((n) => Notifications.dismissNotificationAsync(n.request.identifier)));
        })
        .catch((e) => console.warn('Falha ao limpar os avisos', e));
      return running;
    },
    onOpen: (listener) => {
      openListeners.add(listener);
      listen();
      return () => {
        openListeners.delete(listener);
        stopIfIdle();
      };
    },
    onAction: (listener) => {
      actionListeners.add(listener);
      listen();
      return () => {
        actionListeners.delete(listener);
        stopIfIdle();
      };
    },
  };
}
