// Ajustes › Segurança (protótipo "Glife Bloqueio", seção 04). O que não pode ser desligado aparece como texto
// com cadeado. Ligar a biometria pede a digital uma vez antes de salvar; desligar não pede nada.
// Sem "Apps recentes": o app não se esconde da lista (decisão do usuário de 24/11/2026).
import { LOCK_TIMEOUT_OPTIONS, disableBiometrics, enableBiometrics } from '@glife/domain/applock';
import { router } from 'expo-router';
import { Check, ChevronRight, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { BackHeader, Icon, Screen, Section, Switch, Text, makeStyles, useTheme, useToast } from '@/shared/ui';

import { useAppLock } from '../hooks/AppLockProvider';
import { timeoutLabel } from '../hooks/lockText';

const isWeb = Platform.OS === 'web';

export function SecurityScreen() {
  const s = useStyles();
  const t = useTheme();
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
    <Screen>
      <BackHeader title="Segurança" backLabel="Ajustes" />

      <Section title="Bloqueio">
        <View>
          <View style={s.row}>
            <Text>Pedir desbloqueio</Text>
            <View style={s.always}>
              <Icon icon={Lock} size={t.icon.small - t.space[0.5]} color="textTertiary" />
              <Text variant="small" tone="tertiary">
                Sempre ligado
              </Text>
            </View>
          </View>
          <Text variant="caption" tone="tertiary">
            {isWeb
              ? 'O Glife pede a senha do app ao abrir a página e quando a aba volta a ficar visível. Não pode ser desligado.'
              : 'O Glife pede desbloqueio sempre que abre e quando volta do segundo plano. Não pode ser desligado.'}
          </Text>
          {!isWeb && (bioAvailable || bioOn) && (
            <>
              <View style={[s.row, s.rowGap]}>
                <Text>Usar biometria</Text>
                <Switch label="Usar biometria" value={bioOn} disabled={busy} onChange={(v) => void toggleBio(v)} />
              </View>
              <Text variant="caption" tone="tertiary">
                Digital ou rosto cadastrados no celular. Se falhar, o Glife pede a senha do app, nunca o PIN do
                celular.
              </Text>
            </>
          )}
        </View>
      </Section>

      <Section title="Bloquear depois de">
        <View accessibilityRole="radiogroup">
          <Text variant="caption" tone="tertiary" style={s.afterNote}>
            {isWeb ? 'Tempo com a aba escondida antes de pedir de novo.' : 'Tempo em segundo plano antes de pedir de novo.'}
          </Text>
          {LOCK_TIMEOUT_OPTIONS.map((ms) => {
            const on = status?.timeoutMs === ms;
            return (
              <Pressable
                key={ms}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => void pickTimeout(ms)}
                style={({ pressed }) => [s.option, pressed && s.pressed]}
              >
                <Text>{timeoutLabel(ms)}</Text>
                {on && <Icon icon={Check} size={t.icon.size} color="accentInk" />}
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Senha do app">
        <View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/trocar-senha')}
            style={({ pressed }) => [s.option, s.nav, pressed && s.pressed]}
          >
            <Text>Trocar a senha do app</Text>
            <Icon icon={ChevronRight} size={t.icon.small + t.space[0.5]} color="textTertiary" />
          </Pressable>
          <Text variant="caption" tone="tertiary">
            Só deste aparelho. Diferente da senha da conta.
          </Text>
        </View>
      </Section>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.size.navRow,
  },
  rowGap: { marginTop: t.space[4] },
  always: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5] },
  afterNote: { marginBottom: t.space[1] },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: t.touch.minTarget,
  },
  nav: { minHeight: t.size.navRow },
  pressed: { opacity: t.opacity.pressed },
}));
