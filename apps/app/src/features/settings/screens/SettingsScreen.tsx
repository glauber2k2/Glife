import { FileText, Receipt } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  Chip,
  Input,
  ListItem,
  Screen,
  Section,
  Sheet,
  Text,
  makeStyles,
  useTheme,
  useThemePreference,
  type ThemePreference,
} from '@/shared/ui';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

export function SettingsScreen() {
  const s = useStyles();
  const t = useTheme();
  const { preference, setPreference } = useThemePreference();
  const [sheet, setSheet] = useState(false);

  return (
    <Screen title="Ajustes">
      <Section title="Aparência">
        <View style={s.row}>
          {THEMES.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              selected={preference === o.value}
              onPress={() => setPreference(o.value)}
            />
          ))}
        </View>
      </Section>

      <Section title="Design system">
        <View style={s.stack}>
          <Text variant="display">Display 32</Text>
          <Text variant="title">Título 24</Text>
          <Text variant="heading">Seção 20</Text>
          <Text>Texto corrido 16, entrelinha generosa para leitura confortável.</Text>
          <Text variant="scripture">
            Porque Deus amou o mundo de tal maneira… (serifa 18, modo leitura)
          </Text>
          <Text variant="caption" tone="tertiary">
            Legenda 12
          </Text>
          <View style={s.row}>
            {(['yellow', 'green', 'blue', 'pink'] as const).map((c) => (
              <View key={c} style={[s.swatch, { backgroundColor: t.colors.highlight[c] }]} />
            ))}
          </View>
          <View style={s.row}>
            <Button label="Salvar" haptic />
            <Button label="Cancelar" variant="secondary" />
            <Button label="Ver mais" variant="ghost" />
          </View>
          <Input label="Descrição" placeholder="Mercado" hint="Opcional" />
          <View>
            <ListItem icon={Receipt} title="Atacadão" subtitle="Mercado · Nubank" trailing={<Text variant="label">R$ 87,50</Text>} onPress={() => {}} />
            <ListItem icon={FileText} title="Compras do mês" subtitle="Nota" separator={false} onPress={() => {}} />
          </View>
          <Button label="Abrir folha" variant="secondary" onPress={() => setSheet(true)} />
        </View>
      </Section>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Folha">
        <Text tone="secondary">Folhas usam superfície e cantos de 12 px, sem sombra.</Text>
        <Button label="Fechar" fullWidth onPress={() => setSheet(false)} />
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  stack: { gap: t.space[4] },
  swatch: { width: t.size.swatch, height: t.size.swatch, borderRadius: t.radius.field },
}));
