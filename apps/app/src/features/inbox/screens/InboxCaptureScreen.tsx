import { router } from 'expo-router';
import { ArrowUp, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Alert, BackHeader, Button, IconButton, Input, Mascot, Screen, Text, makeStyles, useTheme } from '@/shared/ui';

/**
 * Captura (botão +, Cobalto): "O que você quer guardar?". Ainda não há onde gravar (a caixa de entrada com IA chega
 * na Fase 6), então "Enviar" fica desabilitado: fechar a tela fingindo que salvou perderia o texto.
 */
const CAN_SAVE = false;

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function InboxCaptureScreen() {
  const s = useStyles();
  const t = useTheme();
  const [text, setText] = useState('');
  return (
    <Screen header={<BackHeader left={<IconButton icon={X} label="Fechar" onPress={close} />} />}>
      <View style={s.head}>
        <Mascot size={t.size.iconButton - t.space[2.5]} />
        <Text variant="heading" accessibilityRole="header" style={s.grow}>
          O que você quer guardar?
        </Text>
      </View>
      <Input
        placeholder="Escreva… ex.: gastei 87,50 no Atacadão no cartão Nubank"
        value={text}
        onChangeText={setText}
        multiline
        autoFocus
        style={s.field}
        textAlignVertical="top"
      />
      {!CAN_SAVE && (
        <Alert tone="neutral">Guardar chega junto com a caixa de entrada da IA. Por enquanto o texto não é salvo.</Alert>
      )}
      <View style={s.actions}>
        <Button label="Cancelar" variant="neutral" size="sm" selfAlign="center" onPress={close} />
        <Button label="Enviar" icon={ArrowUp} size="sm" selfAlign="center" haptic disabled={!CAN_SAVE || !text.trim()} onPress={close} />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  head: { flexDirection: 'row', alignItems: 'center', gap: t.space[2.5] },
  grow: { flex: 1 },
  field: { minHeight: t.size.captureFieldMinHeight, paddingTop: t.space[3.5] },
  actions: { flexDirection: 'row', gap: t.space[2], justifyContent: 'flex-end' },
}));
