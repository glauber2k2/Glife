import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Screen, Text, makeStyles } from '@/shared/ui';

/** Captura rápida. Na Fase 0 só a tela; gravação em inbox_items vem com o banco local. */
export function InboxCaptureScreen() {
  const s = useStyles();
  const [text, setText] = useState('');
  return (
    <Screen title="Caixa de entrada" scroll={false}>
      <Input
        placeholder="gastei 45 no mercado, lembrar de…"
        value={text}
        onChangeText={setText}
        multiline
        autoFocus
        style={s.field}
        textAlignVertical="top"
      />
      <Text variant="caption" tone="tertiary">
        A IA vai transformar isso em gastos, notas e lembretes — você confirma antes.
      </Text>
      <View style={s.actions}>
        <Button label="Cancelar" variant="secondary" onPress={() => router.back()} />
        <Button label="Guardar" haptic disabled={!text.trim()} onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  field: { minHeight: 160, paddingTop: t.space[3] },
  actions: { flexDirection: 'row', gap: t.space[3], justifyContent: 'flex-end' },
}));
