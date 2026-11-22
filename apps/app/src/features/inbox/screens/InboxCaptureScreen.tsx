import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Screen, Text, makeStyles } from '@/shared/ui';

/**
 * Captura rápida. Ainda não há onde gravar (inbox_items chega com o banco local, item 0.8),
 * então "Guardar" fica desabilitado: fechar a tela fingindo que salvou perderia o texto.
 */
const CAN_SAVE = false;
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
        {CAN_SAVE
          ? 'A IA vai transformar isso em gastos, notas e lembretes — você confirma antes.'
          : 'Guardar chega junto com o banco local. Por enquanto o texto não é salvo.'}
      </Text>
      <View style={s.actions}>
        <Button label="Cancelar" variant="secondary" onPress={() => router.back()} />
        <Button label="Guardar" haptic disabled={!CAN_SAVE || !text.trim()} onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  field: { minHeight: t.size.captureFieldMinHeight, paddingTop: t.space[3] },
  actions: { flexDirection: 'row', gap: t.space[3], justifyContent: 'flex-end' },
}));
