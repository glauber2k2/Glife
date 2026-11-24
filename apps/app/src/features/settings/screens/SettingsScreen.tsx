import { FileText, Receipt } from 'lucide-react-native';
import { useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import {
  BackHeader,
  Button,
  Input,
  ListItem,
  Screen,
  Section,
  SegmentedControl,
  Sheet,
  Text,
  makeStyles,
  useTheme,
  useThemePreference,
  type ThemePreference,
} from '@/shared/ui';

// Ordem do protótipo "Glife Acesso" (Ajustes › Aparência): Claro, Escuro, Sistema.
const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
];

/** `account` e `security`: compostas na rota (Ajustes não conhece as features de autenticação e bloqueio). */
export function SettingsScreen({ account, security }: { account?: ReactNode; security?: ReactNode } = {}) {
  const s = useStyles();
  const t = useTheme();
  const { preference, setPreference } = useThemePreference();
  const [sheet, setSheet] = useState(false);
  const [items, setItems] = useState([1, 2, 3]);
  const nextItem = useRef(4);

  return (
    <Screen>
      <View style={s.header}>
        <BackHeader title="Ajustes" fallback="/" />
      </View>
      <Section title="Aparência">
        <View style={s.theme}>
          <Text>Tema</Text>
          <SegmentedControl label="Tema" options={THEMES} value={preference} onChange={setPreference} />
        </View>
      </Section>

      {security && <Section title="Segurança">{security}</Section>}

      {account && (
        <Section title="Conta">
          <View style={s.stack}>{account}</View>
        </Section>
      )}

      <Section title="Design system">
        <View style={s.stack}>
          <Text variant="display" numeric>R$ 3.184,20</Text>
          <Text variant="title">Título 34</Text>
          <Text variant="heading">Subtítulo 20</Text>
          <Text variant="item">Item 17</Text>
          <Text>Texto 15 em Hanken Grotesk, para toda a interface.</Text>
          <Text variant="scripture">
            Porque Deus amou o mundo de tal maneira… (Crimson Pro 20, só para ler)
          </Text>
          <Text variant="label" tone="tertiary">Rótulo de bloco</Text>
          <Text variant="caption" tone="tertiary">
            Legenda 12,5
          </Text>
          <View style={s.row}>
            {(['ice', 'honey', 'mint', 'lilac'] as const).map((c) => (
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
            <ListItem icon={Receipt} title="Atacadão" subtitle="Mercado · Nubank" trailing={<Text variant="small" numeric>R$ 87,50</Text>} onPress={() => {}} />
            <ListItem icon={FileText} title="Compras do mês" subtitle="Nota" separator={false} onPress={() => {}} />
          </View>
          <Button label="Abrir folha" variant="secondary" onPress={() => setSheet(true)} />
          <Text variant="heading">Lista em movimento</Text>
          <Text variant="small" tone="secondary">
            Adicione ou remova o primeiro item para ver a lista se reorganizar.
            A preferência de reduzir movimento do sistema é respeitada.
          </Text>
          <View style={s.row}>
            <Button label="Adicionar" variant="secondary" onPress={() => {
              const id = nextItem.current;
              nextItem.current = id + 1;
              setItems((current) => [id, ...current]);
            }} />
            <Button
              label="Remover"
              variant="ghost"
              disabled={items.length === 0}
              onPress={() => setItems((current) => current.slice(1))}
            />
          </View>
          <View collapsable={false}>
            {items.map((id, index) => (
              <ListItem key={id} title={`Exemplo ${id}`} icon={FileText} animated separator={index < items.length - 1} />
            ))}
            {items.length === 0 && <Text tone="tertiary">Adicione um item para experimentar.</Text>}
          </View>
        </View>
      </Section>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Folha">
        <Text tone="secondary">A folha sobe com a mola de ênfase; véu e uma linha de 1 px a separam da página, sem sombra.</Text>
        <Button label="Fechar" fullWidth onPress={() => setSheet(false)} />
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  // título → primeira seção: 32 px, como no protótipo
  header: { marginBottom: t.space[2] },
  theme: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: t.space[3],
    paddingBottom: t.space[2],
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  stack: { gap: t.space[4] },
  swatch: { width: t.size.swatch, height: t.size.swatch, borderRadius: t.radius.field },
}));
