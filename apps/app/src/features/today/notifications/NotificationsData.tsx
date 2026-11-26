// Central de notificações: junta o que cada feature tem para avisar (finanças, agenda, dieta), monta o feed do domain
// e guarda o "visto até" no aparelho (porta `SeenStore`, injetada na raiz). Só `today` compõe várias features.
import { useAgendaNotifications } from '@/features/agenda';
import { useDietNotifications } from '@/features/diet';
import { useFinanceNotifications } from '@/features/finance';
import { buildFeed, type AppNotification, type Feed, type NotificationModule } from '@glife/domain/notifications';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { SeenStore } from '@/shared/lib/seenStore';
import type { NoticeScheduler } from '@/shared/lib/notices';

import { noticeForSnooze } from './snooze';

const MINUTE_MS = 60_000;

interface NotificationsValue {
  feed: Feed;
  /** false enquanto nenhum módulo terminou a primeira leitura */
  ready: boolean;
  /** há algo novo (o ponto do sino); falso até ler o "visto até" */
  hasUnread: boolean;
  now: Date;
  markAllRead: () => void;
  /** Resolve na hora (Confirmar, Feito) pela feature dona. */
  resolve: (n: AppNotification) => Promise<void>;
  snooze: (n: AppNotification, at: Date) => Promise<boolean>;
}

const EMPTY: Feed = { groups: [], unread: 0 };
const NotificationsContext = createContext<NotificationsValue | null>(null);

/** Relógio da central: anda a cada minuto e quando o app volta ao primeiro plano. */
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), MINUTE_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setNow(new Date()));
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return now;
}

export function NotificationsProvider({ store, scheduler, children }: { store: SeenStore; scheduler: Pick<NoticeScheduler, 'snooze'>; children: ReactNode }) {
  const now = useMinuteClock();
  const finance = useFinanceNotifications(now);
  const agenda = useAgendaNotifications(now);
  const diet = useDietNotifications(now);
  const [seen, setSeen] = useState<{ loaded: boolean; at: Date | null }>({ loaded: false, at: null });

  useEffect(() => {
    let active = true;
    void store.load().then((at) => {
      // Não sobrescreve um "marcar lidas" feito antes de a leitura terminar.
      if (active) setSeen((s) => (s.loaded ? s : { loaded: true, at }));
    });
    return () => {
      active = false;
    };
  }, [store]);

  const sources = useMemo(() => ({ finance, agenda, diet }) satisfies Record<NotificationModule, unknown>, [finance, agenda, diet]);
  const feed = useMemo(() => {
    const items = Object.values(sources).flatMap((s) => s?.items ?? []);
    return items.length ? buildFeed(items, seen.at, now) : EMPTY;
  }, [sources, seen.at, now]);

  const markAllRead = useCallback(() => {
    const at = new Date();
    setSeen({ loaded: true, at });
    void store.save(at);
  }, [store]);

  const resolve = useCallback(
    async (n: AppNotification) => {
      const source = sources[n.module];
      if (!source) throw new Error('Os dados ainda não carregaram');
      await source.resolve(n.id);
    },
    [sources],
  );

  const ready = Object.values(sources).some((s) => s !== null);
  const snooze = useCallback(async (n: AppNotification, at: Date) => {
    const current = sources[n.module]?.items.find((item) => item.id === n.id);
    const notice = current && noticeForSnooze(current);
    if (!notice) throw new Error('Este aviso não está mais pendente.');
    return scheduler.snooze(notice, at);
  }, [sources, scheduler]);
  const value = useMemo(
    () => ({ feed, ready, hasUnread: seen.loaded && feed.unread > 0, now, markAllRead, resolve, snooze }),
    [feed, ready, seen.loaded, now, markAllRead, resolve, snooze],
  );
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

/** Fora do provedor (sem sessão), a central fica vazia. */
export function useNotifications(): NotificationsValue {
  return (
    useContext(NotificationsContext) ?? {
      feed: EMPTY,
      ready: false,
      hasUnread: false,
      now: new Date(),
      markAllRead: () => {},
      resolve: async () => {},
      snooze: async () => false,
    }
  );
}
