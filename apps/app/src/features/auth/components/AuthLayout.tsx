import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button, Reveal, Screen, Text, makeStyles, useTheme } from '@/shared/ui';

/** Coluna de no máximo 400 px, centrada no web, com o fundo da própria página. */
export function AuthScreen({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Screen maxWidth={t.layout.authMaxWidth}>
      <View>{children}</View>
    </Screen>
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
 * Etapas 2 e 3: cabeçalho com o wordmark pequeno e "Sair", título da etapa, texto e conteúdo.
 * O conteúdo entra em cascata, depois da saída da etapa anterior.
 */
export function AuthStep({ title, intro, onSignOut, children }: AuthStepProps) {
  const s = useStyles();
  const t = useTheme();
  return (
    <AuthScreen>
      <View style={s.header}>
        <Text variant="wordmarkSmall" accessibilityRole="header" accessibilityLabel="Glife">
          Glife
        </Text>
        <View style={s.signOut}>
          <Button label="Sair" variant="subtle" onPress={onSignOut} />
        </View>
      </View>
      <Reveal delay={t.motion.stepDelay}>
        <Text variant="title" accessibilityRole="header" style={s.title}>
          {title}
        </Text>
        <View style={s.intro}>{intro}</View>
        {children}
      </Reveal>
    </AuthScreen>
  );
}

/** Bloco numerado da etapa: linha de 1 px no topo, rótulo em caixa alta e conteúdo. */
export function AuthBlock({ label, children, last }: { label: string; children?: ReactNode; last?: boolean }) {
  const s = useStyles();
  return (
    <View style={[s.block, last && s.blockLast]}>
      <Text variant="label" tone="tertiary" accessibilityRole="header">
        {label}
      </Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  header: {
    height: t.layout.headerHeight,
    marginTop: t.space[2] - t.space[6],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signOut: { marginRight: -(t.space[3] + t.space[0.5]) },
  title: { paddingTop: t.space[8] },
  intro: { marginTop: t.space[4], marginBottom: t.space[8], gap: t.space[3] },
  block: {
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
    paddingTop: t.space[6],
    paddingBottom: t.space[8],
  },
  blockLast: { paddingBottom: t.space[5] },
}));
