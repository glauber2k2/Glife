import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button, Mascot, Reveal, Screen, Text, makeStyles, useTheme } from '@/shared/ui';

/** Coluna de no máximo 420 px, centrada no web, com o fundo da própria página. */
export function AuthScreen({ children, header }: { children: ReactNode; header?: ReactNode }) {
  const t = useTheme();
  return (
    <Screen maxWidth={t.layout.authMaxWidth} header={header}>
      {children}
    </Screen>
  );
}

/** Marca: mascote e "Glife" lado a lado. */
export function Lockup({ size }: { size: number }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={s.lockup} accessibilityRole="header" accessibilityLabel="Glife">
      <Mascot size={Math.round(size * 0.9)} eyes={t.colors.bg} />
      <Text variant="wordmarkSmall" style={{ fontSize: size, lineHeight: size }}>
        Glife
      </Text>
    </View>
  );
}

interface AuthStepProps {
  title: string;
  /** texto de apoio sob o título */
  intro: ReactNode;
  onSignOut: () => void;
  children: ReactNode;
}

/**
 * Etapas 2 e 3: cabeçalho com a marca pequena e "Sair", título da etapa, texto e conteúdo.
 * O conteúdo entra em cascata, depois da saída da etapa anterior.
 */
export function AuthStep({ title, intro, onSignOut, children }: AuthStepProps) {
  const s = useStyles();
  const t = useTheme();
  return (
    <AuthScreen
      header={
        <View style={s.header}>
          <Lockup size={t.type.wordmarkSmall.fontSize} />
          <Button label="Sair" variant="ghost" size="sm" selfAlign="center" onPress={onSignOut} />
        </View>
      }
    >
      <Reveal delay={t.motion.stepDelay}>
        <View style={s.titles}>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          <View style={s.intro}>{intro}</View>
        </View>
        <View style={s.body}>{children}</View>
      </Reveal>
    </AuthScreen>
  );
}

/** Bloco da etapa: rótulo em caixa alta e conteúdo. */
export function AuthBlock({ label, children }: { label: string; children?: ReactNode; last?: boolean }) {
  const s = useStyles();
  return (
    <View style={s.block}>
      <Text variant="label" tone="tertiary" accessibilityRole="header">
        {label}
      </Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  lockup: { flexDirection: 'row', alignItems: 'center', gap: t.space[2.5] },
  header: { minHeight: t.touch.minTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titles: { gap: t.space[2] },
  intro: { gap: t.space[3] },
  body: { gap: t.space[6], marginTop: t.space[6] },
  block: { gap: t.space[3] },
}));
