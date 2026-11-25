// Junta os avisos da agenda e da dieta e entrega ao agendador do aparelho (injetado na raiz). Recalcula quando os
// dados mudam e quando o app volta ao primeiro plano (a janela de dias anda). Tocar num aviso abre a tela dele.
import { useAgendaNotices } from '@/features/agenda';
import { useDietNotices } from '@/features/diet';
import { localNow, upcomingNotices } from '@glife/domain/time';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { NoticeScheduler } from '@/shared/lib/notices';

/** Janela agendada: 7 dias, no máximo 60 avisos (o Android limita alarmes por app). */
const DAYS = 7;
const MAX = 60;
const DEBOUNCE_MS = 1000;

export function NoticesSync({ scheduler }: { scheduler: NoticeScheduler }) {
  const [, setTick] = useState(0);
  const agenda = useAgendaNotices(DAYS);
  const diet = useDietNotices(DAYS);

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
  return null;
}
