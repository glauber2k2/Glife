// Android/iOS: avisos locais (funcionam offline) com expo-notifications. Cada aparelho agenda os seus; nada disso
// sincroniza. Os avisos do Glife levam `data.glife` para não mexer em outros que existam.
import { localNow } from '@glife/domain/time';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { SAFE_NOTICE_ROUTES, type NoticeScheduler } from './types';

const CHANNEL = 'lembretes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

async function ready(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // AndroidImportance vem por reexportação que o plugin de import não segue (o tsc confere o tipo).
    // eslint-disable-next-line import/namespace
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Lembretes', importance: Notifications.AndroidImportance.HIGH });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** "AAAA-MM-DD" + "HH:MM" na hora local do aparelho. */
const localDate = (date: string, time: string) =>
  new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), Number(time.slice(0, 2)), Number(time.slice(3, 5)));

export function createNoticeScheduler(): NoticeScheduler {
  let running: Promise<void> = Promise.resolve();
  return {
    // Em fila: duas trocas seguidas não se atropelam.
    replaceAll: (notices) => {
      running = running
        .then(async () => {
          const ours = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) => n.content.data?.glife === true);
          await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
          if (notices.length === 0 || !(await ready())) return;
          const now = localNow();
          for (const n of notices) {
            if (`${n.date}T${n.time}` <= `${now.date}T${now.time}`) continue;
            await Notifications.scheduleNotificationAsync({
              identifier: n.key,
              content: { title: n.title, body: n.body || undefined, data: { glife: true, url: n.url } },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: localDate(n.date, n.time), channelId: CHANNEL },
            });
          }
        })
        .catch((e) => console.warn('Falha ao agendar os avisos', e));
      return running;
    },
    onOpen: (listener) => {
      const sub = Notifications.addNotificationResponseReceivedListener((r) => {
        const url = r.notification.request.content.data?.url;
        if (typeof url === 'string' && SAFE_NOTICE_ROUTES.test(url)) listener(url);
      });
      return () => sub.remove();
    },
  };
}
