// Portão visual: com sessão pronta, nada do app aparece sem desbloqueio. Ao abrir, o app só é montado depois
// da senha ou da biometria; ao voltar do segundo plano, a tela de bloqueio cobre o app (que mantém o lugar)
// e, ao liberar, esmaece de 1 para 0. Entrada sem animação: um fade deixaria o conteúdo transparecer.
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { makeStyles, useReduceMotion, useTheme } from '@/shared/ui';

import { useAppLock } from '../hooks/AppLockProvider';
import { CreatePasswordScreen } from '../screens/CreatePasswordScreen';
import { LockScreen } from '../screens/LockScreen';

export function AppLockGate({ active, children }: { active: boolean; children: ReactNode }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const { gate, locked, status, broken } = useAppLock();
  const [mounted, setMounted] = useState(false);
  const [creating, setCreating] = useState(false);

  // Sessão encerrada ou rebaixada: na próxima, pede de novo e remonta o app do zero.
  useEffect(() => {
    if (!active) gate.lock();
  }, [active, gate]);
  // Ajustes durante a renderização (sem efeito): montar o app no 1º desbloqueio; desmontar sem sessão.
  if (active && !locked && !mounted) setMounted(true);
  if (!active && mounted) setMounted(false);
  // Sem senha ainda: a criação dura até o fim da oferta da biometria, mesmo com o registro já gravado.
  if (active && status && !status.configured && !broken && !creating) setCreating(true);

  if (!active) return <>{children}</>;

  const showCreate = creating;
  const cover = locked || showCreate;
  const overlay = !status && !broken ? (
    <View style={s.blank} />
  ) : showCreate ? (
    <CreatePasswordScreen
      onDone={() => {
        setCreating(false);
        gate.unlock();
      }}
    />
  ) : (
    <LockScreen />
  );

  // No web, o conteúdo coberto sai também do teclado e do leitor de tela.
  const hidden = cover ? (Platform.OS === 'web' ? { 'aria-hidden': true, inert: true } : {}) : {};

  return (
    <View style={s.root}>
      {mounted && (
        <View
          style={s.root}
          importantForAccessibility={cover ? 'no-hide-descendants' : 'auto'}
          accessibilityElementsHidden={cover}
          {...hidden}
        >
          {children}
        </View>
      )}
      {cover && (
        <Animated.View
          style={[StyleSheet.absoluteFill, s.cover]}
          exiting={reduceMotion ? undefined : FadeOut.duration(t.motion.standard)}
        >
          {overlay}
        </Animated.View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1 },
  cover: { backgroundColor: t.colors.bg },
  blank: { flex: 1, backgroundColor: t.colors.bg },
}));
