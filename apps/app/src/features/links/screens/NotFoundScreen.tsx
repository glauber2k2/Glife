// Item não encontrado (protótipo "nao-encontrado"): quando um vínculo ou aviso aponta para algo indisponível, a tela diz
// o motivo e o que fazer, sem erro técnico — na lixeira (Restaurar), ainda não chegou (Sincronizar agora) ou excluído
// para sempre (Voltar). Restaurar troca a tela pelo item.
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { RotateCcw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { errorText } from '@/shared/lib/errorText';
import { syncResultText, useSyncNow, useSyncState } from '@/shared/lib/powersync';
import { BackHeader, Button, Mascot, Screen, Text, makeStyles, useReduceMotion, useTheme, useToast } from '@/shared/ui';

import { notFoundView, parseNotFoundParams, type NotFoundView, type TargetStatus } from '../data/targets';
import { useResolveTarget, useTargetSources } from '../hooks/Targets';

const COPY: Record<NotFoundView, { title: (noun: string) => string; message: string }> = {
  lixeira: {
    title: (noun) => `${noun} está na lixeira`,
    message: 'Está na lixeira deste aparelho. Se restaurar, volta para o lugar de antes, com os vínculos.',
  },
  naosync: {
    title: () => 'Ainda não chegou neste aparelho',
    message: 'Ainda não está neste aparelho. Se existir na nuvem, chega na próxima sincronização.',
  },
  apagado: {
    title: () => 'Não encontrei este item',
    message: 'Este item não existe mais, nem aqui nem na nuvem. O vínculo continua nas notas, marcado como quebrado.',
  },
  semtela: {
    title: () => 'Não consigo abrir este item aqui',
    message: 'Este item está salvo neste aparelho, mas ainda não há uma tela para abri-lo por aqui.',
  },
};

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

export function NotFoundScreen() {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const reduceMotion = useReduceMotion();
  const params = useLocalSearchParams<{ tipo?: string; id?: string }>();
  const target = parseNotFoundParams(params);
  const source = useTargetSources().find((x) => x.type === target?.type) ?? null;
  const resolve = useResolveTarget();
  const sync = useSyncState();
  const syncNow = useSyncNow();
  const [status, setStatus] = useState<TargetStatus | null>(target && source ? null : 'missing');
  const [busy, setBusy] = useState(false);

  // Pedido de conferir de novo (depois de restaurar ou sincronizar).
  const [round, setRound] = useState(0);
  const type = target?.type;
  const id = target?.id;

  // Confere ao abrir, a cada sincronização concluída (o item pode chegar com a tela aberta) e depois de cada ação.
  useEffect(() => {
    if (!type || !id || !source) return;
    let active = true;
    void (async () => {
      const next = await resolve(type, id).catch(() => 'missing' as const);
      if (!active) return;
      if (next === 'alive') {
        // Chegou ou foi restaurado: a tela dá lugar ao item.
        const href = await source.href(id).catch(() => null);
        if (active && href) return router.replace(href as Href);
      }
      if (active) setStatus(next);
    })();
    return () => {
      active = false;
    };
  }, [type, id, source, resolve, sync.lastSyncedAt, round]);

  const view: NotFoundView = status ? notFoundView(status, sync) : 'apagado';
  const copy = COPY[view];

  const restore = async () => {
    if (!target || !source?.restore) return;
    setBusy(true);
    try {
      await source.restore(target.id);
      toast({ message: 'Restaurado', icon: RotateCcw });
      setRound((n) => n + 1);
    } catch (e) {
      toast({ message: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const syncAgain = async () => {
    setBusy(true);
    try {
      const result = await syncNow();
      if (result !== 'ok') toast({ message: syncResultText(result) });
      setRound((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen header={<BackHeader fallback="/" />}>
      {status !== null && (
        <Animated.View key={view} entering={FadeIn.duration(reduceMotion ? t.motion.tap : t.motion.standard)} style={s.body}>
          <Mascot size={t.size.mascot} eyes={t.colors.bg} mood="pensando" float />
          <Text variant="heading" align="center" accessibilityRole="header">
            {copy.title(source?.noun ?? 'Este item')}
          </Text>
          <Text tone="tertiary" align="center" style={s.message}>
            {copy.message}
          </Text>
          <View style={s.actions}>
            {view === 'lixeira' && source?.restore && <Button label="Restaurar" fullWidth haptic loading={busy} onPress={restore} />}
            {view === 'lixeira' && source?.trashHref && (
              <Button label="Abrir a lixeira" variant="secondary" fullWidth onPress={() => router.push(source.trashHref as Href)} />
            )}
            {view === 'naosync' && <Button label="Sincronizar agora" fullWidth loading={busy} onPress={syncAgain} />}
            {(view !== 'lixeira' || !source?.restore) && (
              <Button label="Voltar" variant={view === 'apagado' ? 'primary' : 'secondary'} fullWidth onPress={goBack} />
            )}
          </View>
        </Animated.View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  body: { alignItems: 'center', gap: t.space[2.5], paddingTop: t.space[10], paddingHorizontal: t.space[3] },
  message: { maxWidth: t.layout.emptyTextMax, marginBottom: t.space[1] },
  actions: { width: '100%', maxWidth: t.layout.emptyActionsMax, gap: t.space[2.5], marginTop: t.space[2] },
}));
