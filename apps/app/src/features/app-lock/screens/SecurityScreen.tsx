// Ajustes › Segurança (protótipo do redesign Cobalto, tela "Segurança"). O bloqueio aparece como sempre ligado,
// explicado e não desligável. Ligar a biometria pede a digital uma vez antes de salvar; desligar não pede nada.
// Sem "Apps recentes": o app não se esconde da lista (decisão do usuário de 24/11/2026).
import { LOCK_TIMEOUT_OPTIONS, disableBiometrics, enableBiometrics } from '@glife/domain/applock';
import { router } from 'expo-router';
import { Fingerprint, KeyRound, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  BackHeader,
  Card,
  ListGroup,
  ModuleIcon,
  NavRow,
  Radio,
  Reveal,
  Screen,
  Section,
  Switch,
  Text,
  makeStyles,
  usePress,
  useToast,
} from '@/shared/ui';

import { useAppLock } from '../hooks/AppLockProvider';
import { timeoutLabel } from '../hooks/lockText';

const isWeb = Platform.OS === 'web';

export function SecurityScreen() {
  const s = useStyles();
  const toast = useToast();
  const { lock, bio, status, bioAvailable, refresh, withSystemPrompt } = useAppLock();
  const [busy, setBusy] = useState(false);
  const bioOn = !!status?.biometrics;

  const toggleBio = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (!next) await disableBiometrics(lock, bio);
      else {
        const outcome = await withSystemPrompt(() => enableBiometrics(lock, bio));
        if (outcome === 'unavailable') toast({ message: 'Nenhuma digital cadastrada no celular.' });
        else if (outcome === 'error') toast({ message: 'A biometria não respondeu. Tente de novo.' });
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const pickTimeout = async (ms: number) => {
    await lock.setTimeout(ms);
    await refresh();
  };

  return (
    <Screen header={<BackHeader title="Segurança" backLabel="Ajustes" fallback="/ajustes" />}>
      <Reveal>
        <Card>
          <View style={s.intro}>
            <ModuleIcon icon={Lock} tone="tonal" />
            <View style={s.introText}>
              <Text variant="emphasis">Bloqueio sempre ligado</Text>
              <Text variant="small" tone="tertiary">
                {isWeb
                  ? 'O Glife pede a senha do app ao abrir a página e quando a aba volta a ficar visível. Não pode ser desligado.'
                  : 'O Glife pede a digital ou a senha do app ao abrir e ao voltar depois de um tempo. Seus dados ficam protegidos mesmo com o celular desbloqueado.'}
              </Text>
            </View>
          </View>
        </Card>

        <ListGroup>
          {!isWeb && (bioAvailable || bioOn) && (
            <NavRow
              icon={Fingerprint}
              label="Usar digital"
              meta="Se falhar, pede a senha do app"
              tall
              trailing={<Switch label="Usar digital" value={bioOn} disabled={busy} onChange={(v) => void toggleBio(v)} />}
            />
          )}
          <NavRow icon={KeyRound} label="Trocar a senha do app" meta="Só deste aparelho" onPress={() => router.push('/trocar-senha')} />
        </ListGroup>

        <Section title="Bloquear depois de">
          <ListGroup>
            {LOCK_TIMEOUT_OPTIONS.map((ms) => (
              <TimeoutRow key={ms} label={timeoutLabel(ms)} selected={status?.timeoutMs === ms} onPress={() => void pickTimeout(ms)} />
            ))}
          </ListGroup>
          <Text variant="micro" tone="tertiary">
            {isWeb ? 'Conta o tempo com a aba escondida.' : 'Conta o tempo com o Glife em segundo plano.'}
          </Text>
        </Section>
      </Reveal>
    </Screen>
  );
}

function TimeoutRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const s = useStyles();
  const press = usePress();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[s.option, press.style]}>
        <Text variant="item" style={s.grow}>
          {label}
        </Text>
        <Radio selected={selected} />
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  intro: { flexDirection: 'row', gap: t.space[3], alignItems: 'flex-start' },
  introText: { flex: 1, gap: t.space[1] },
  option: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.navRow, paddingVertical: t.space[3] },
  grow: { flex: 1 },
}));
