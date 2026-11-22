import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { makeStyles, useTheme } from './theme';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Folha inferior simples. Separação por cor de superfície, sem sombra. */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const s = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={[s.sheet, { paddingBottom: t.space[6] + insets.bottom }]}>
          <View style={s.grabber} />
          {title && <Text variant="heading">{title}</Text>}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const), backgroundColor: t.colors.scrim },
  sheet: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: t.radius.card,
    borderTopRightRadius: t.radius.card,
    padding: t.space[6],
    gap: t.space[4],
    width: '100%',
    maxWidth: t.layout.sheetMaxWidth,
    alignSelf: 'center',
  },
  grabber: {
    alignSelf: 'center',
    width: t.size.grabberWidth,
    height: t.size.grabberHeight,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.hairline,
    marginTop: -t.space[2],
  },
}));
