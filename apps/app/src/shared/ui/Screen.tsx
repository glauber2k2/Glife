import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from './Text';
import { makeStyles } from './theme';

export interface ScreenProps {
  title?: string;
  /** texto pequeno acima do título (ex.: data de hoje) */
  eyebrow?: string;
  children: ReactNode;
  scroll?: boolean;
}

/** Contêiner padrão: área segura, margens largas, coluna única centralizada no web. */
export function Screen({ title, eyebrow, children, scroll = true }: ScreenProps) {
  const s = useStyles();
  const content = (
    <View style={s.column}>
      {(title || eyebrow) && (
        <View style={s.header}>
          {eyebrow && (
            <Text variant="caption" tone="tertiary">
              {eyebrow.toUpperCase()}
            </Text>
          )}
          {title && (
            <Text variant="display" accessibilityRole="header">
              {title}
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
  scroll: { paddingHorizontal: t.space[6], paddingTop: t.space[8], paddingBottom: t.space[12] },
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: t.layout.contentMaxWidth, alignSelf: 'center', gap: t.space[8] },
  header: { gap: t.space[1] },
}));
