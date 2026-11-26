// Junta os avisos da agenda e da dieta e entrega ao agendador do aparelho (injetado na raiz). Recalcula quando os
// dados mudam e quando o app volta ao primeiro plano (a janela de dias anda). Tocar num aviso abre a tela dele; os
// botões do aviso: "Feito" conclui o lembrete, "Registrar" abre o registro já na refeição ("Adiar" o agendador faz).
import { useAgendaNotices, useCompleteReminder } from '@/features/agenda';
import { useDietNotices } from '@/features/diet';
import { localNow, upcomingNotices } from '@glife/domain/time';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { mealLogRoute, type NoticeActionEvent, type NoticeScheduler } from '@/shared/lib/notices';

/** Janela agendada: 7 dias, no máximo 60 avisos (o Android limita alarmes por app). */
const DAYS = 7;
const MAX = 60;
const DEBOUNCE_MS = 1000;

export function NoticesSync({ scheduler }: { scheduler: NoticeScheduler }) {
  const [, setTick] = useState(0);
  const agenda = useAgendaNotices(DAYS);
  const diet = useDietNotices(DAYS);
  const completeReminder = useCompleteReminder();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setTick((n) => n + 1));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Sem sessão (os dois nulos): nada agendado. Só um carregado ainda: espera o outro.
    if (agenda === null && diet === null) {
      void scheduler.replaceAll([]);
      return;
    }
    if (agenda === null || diet === null) return;
    const t = setTimeout(() => void scheduler.replaceAll(upcomingNotices([...agenda, ...diet], localNow(), MAX)), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [agenda, diet, scheduler]);

  useEffect(() => scheduler.onOpen((url) => router.push(url as Href)), [scheduler]);

  // "Feito" pode chegar antes de a sessão abrir (app aberto pelo botão): espera o repositório da agenda.
  const pending = useRef<NoticeActionEvent[]>([]);
  const complete = useRef(completeReminder);
  useEffect(() => {
    complete.current = completeReminder;
    if (!completeReminder) return;
    const queued = pending.current.splice(0);
    for (const e of queued) void completeReminder(e.notice.id, e.notice.date).catch((err) => console.warn('Falha ao concluir o lembrete', err));
  }, [completeReminder]);

  useEffect(
    () =>
      scheduler.onAction((e) => {
        if (e.action === 'log' && e.notice.kind === 'meal') {
          const url = mealLogRoute(e.notice.id);
          if (url) router.push(url as Href);
          return;
        }
        if (e.action !== 'done' || e.notice.kind !== 'reminder') return;
        const done = complete.current;
        if (!done) {
          pending.current.push(e);
          return;
        }
        void done(e.notice.id, e.notice.date).catch((err) => console.warn('Falha ao concluir o lembrete', err));
      }),
    [scheduler],
  );
  return null;
}
