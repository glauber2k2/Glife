import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from './Text';
import { makeStyles } from './theme';

export interface ScreenProps {
  title?: string;
  /** texto pequeno acima do título (ex.: data de hoje) */
  eyebrow?: string;
  /** frase em serifa itálica abaixo do título */
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  /** coluna mais estreita (telas de acesso) */
  maxWidth?: number;
  /** ação à direita do título (ex.: botão de criar) */
  action?: ReactNode;
}

/** Contêiner padrão: área segura, margem lateral de 22 px, coluna única centralizada no web. */
export function Screen({ title, eyebrow, subtitle, children, scroll = true, maxWidth, action }: ScreenProps) {
  const s = useStyles();
  const content = (
    <View style={[s.column, maxWidth !== undefined && { maxWidth }]}>
      {(title || eyebrow) && (
        <View style={s.header}>
          {eyebrow && (
            <Text variant="eyebrow" tone="tertiary">
              {eyebrow}
            </Text>
          )}
          {title && (
            <View style={s.titleRow}>
              <Text variant="title" accessibilityRole="header" style={s.title}>
                {title}
              </Text>
              {action}
            </View>
          )}
          {subtitle && (
            <Text variant="subtitle" tone="tertiary">
              {subtitle}
            </Text>
          )}
        </View>
      )}
      {children}
    </View>
  );
  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        <View style={[s.scroll, s.fill]}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: t.layout.gutter, paddingTop: t.space[6], paddingBottom: t.space[12] },
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: t.layout.contentMaxWidth, alignSelf: 'center', gap: t.space[6] },
  header: { gap: t.space[1.5] },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: t.space[3] },
  title: { flex: 1 },
}));
