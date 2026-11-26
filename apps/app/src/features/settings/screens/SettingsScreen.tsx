// Ajustes (protótipo do redesign Cobalto): seções curtas — Aparência, Segurança, Dados, Conta e Sobre — e, no fim,
// a demonstração dos componentes do design system. "Sair deste aparelho" é secundário, sem cor de alerta.
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { FileText, Receipt, Trash2 } from 'lucide-react-native';
import { useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import {
  AIInsight,
  Alert,
  BackHeader,
  Button,
  Card,
  Chip,
  Input,
  ListGroup,
  ListItem,
  Mascot,
  NavRow,
  ProgressBar,
  ProgressRing,
  Reveal,
  Screen,
  Section,
  SegmentedControl,
  Sheet,
  Tag,
  Text,
  makeStyles,
  useTheme,
  useThemePreference,
  type ThemePreference,
} from '@/shared/ui';

// Ordem do protótipo (Ajustes › Aparência): Claro, Escuro, Sistema.
const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
];

const VERSION = Constants.expoConfig?.version ?? '';

/** `account` e `security`: compostas na rota (Ajustes não conhece as features de autenticação e bloqueio). */
export function SettingsScreen({ account, security }: { account?: ReactNode; security?: ReactNode } = {}) {
  const s = useStyles();
  const t = useTheme();
  const { preference, setPreference } = useThemePreference();

  return (
    <Screen header={<BackHeader fallback="/" />}>
      <Reveal>
        <View style={s.hero}>
          <View style={s.mascot}>
            <Mascot size={t.size.mascotHeader} color={t.colors.onAccent} eyes={t.colors.accent} mood="feliz" />
          </View>
          <View style={s.heroText}>
            <Text variant="title" accessibilityRole="header">
              Ajustes
            </Text>
            <Text variant="small" tone="tertiary">
              {VERSION ? `Glife ${VERSION}` : 'Glife'}
            </Text>
          </View>
        </View>

        <Section title="Aparência">
          <ListGroup>
            <View style={s.themeRow}>
              <Text variant="item" style={s.grow}>
                Tema
              </Text>
              <SegmentedControl label="Tema" options={THEMES} value={preference} onChange={setPreference} />
            </View>
          </ListGroup>
        </Section>

        {security && (
          <Section title="Segurança">
            <ListGroup>{security}</ListGroup>
          </Section>
        )}

        <Section title="Dados">
          <ListGroup>
            <NavRow icon={Trash2} label="Lixeira" meta="Notas apagadas, para restaurar" onPress={() => router.push('/lixeira')} />
          </ListGroup>
        </Section>

        {account && <Section title="Conta">{account}</Section>}

        <Section title="Sobre">
          <Text variant="small" tone="tertiary">
            {VERSION ? `Glife ${VERSION}` : 'Glife'} · feito para uma pessoa só. Texto bíblico: Bíblia Livre (BLIVRE), CC BY
            4.0, de seus autores e colaboradores.
          </Text>
        </Section>

        <DesignSystemDemo />
      </Reveal>
    </Screen>
  );
}

/** Vitrine dos componentes do Cobalto, para conferir nos dois temas e com "reduzir movimento". */
function DesignSystemDemo() {
  const s = useStyles();
  const t = useTheme();
  const [sheet, setSheet] = useState(false);
  const [chip, setChip] = useState(true);
  const [items, setItems] = useState([1, 2, 3]);
  const nextItem = useRef(4);

  return (
    <Section title="Design system">
      <Card gap={t.space[4]}>
        <Text variant="display" numeric>
          R$ 3.184,20
        </Text>
        <Text variant="title">Título 32</Text>
        <Text variant="heading">Título de seção 20</Text>
        <Text>Corpo 16 em Outfit, para toda a interface.</Text>
        <Text variant="scripture">Porque Deus amou o mundo de tal maneira… (Literata 19, só para ler)</Text>
        <View style={s.row}>
          {(['yellow', 'green', 'blue', 'pink'] as const).map((c) => (
            <View key={c} style={[s.swatch, { backgroundColor: t.colors.highlight[c] }]} />
          ))}
        </View>
        <View style={s.row}>
          <Tag label="Paga" tone="success" />
          <Tag label="Atrasado" tone="danger" />
          <Tag label="Vence em 3 dias" tone="warning" />
          <Tag label="Recorrente" tone="tonal" />
        </View>
        <View style={s.row}>
          <Chip label="Mercado" selected={chip} onPress={() => setChip((v) => !v)} />
          <Chip label="Restaurantes" />
        </View>
        <ProgressBar value={0.62} planned={0.18} />
        <View style={s.row}>
          <ProgressRing value={0.7} size={t.size.ringSmall} stroke={t.size.ringSmallStroke}>
            <Text variant="caption" numeric>
              70%
            </Text>
          </ProgressRing>
        </View>
        <Alert tone="warning" title="Fatura fecha amanhã">
          Dá tempo de revisar os lançamentos.
        </Alert>
        <AIInsight text="Você gastou menos com restaurantes este mês." actionLabel="Ver detalhes" onAction={() => {}} />
        <View style={s.row}>
          <Button label="Salvar" haptic />
          <Button label="Cancelar" variant="secondary" />
          <Button label="Ver mais" variant="ghost" />
        </View>
        <Input label="Descrição" placeholder="Mercado" hint="Opcional" />
      </Card>
      <ListGroup>
        <ListItem icon={Receipt} module="finance" title="Atacadão" subtitle="Mercado · Nubank" trailing={<Text variant="amount" numeric>− R$ 87,50</Text>} onPress={() => {}} />
        <ListItem icon={FileText} module="notes" title="Compras do mês" subtitle="Nota" onPress={() => {}} />
      </ListGroup>
      <Button label="Abrir folha" variant="secondary" onPress={() => setSheet(true)} />
      <Text variant="small" tone="tertiary">
        Lista em movimento: adicione ou remova o primeiro item. A preferência de reduzir movimento do sistema é respeitada.
      </Text>
      <View style={s.row}>
        <Button
          label="Adicionar"
          variant="secondary"
          size="sm"
          onPress={() => {
            const id = nextItem.current;
            nextItem.current = id + 1;
            setItems((current) => [id, ...current]);
          }}
        />
        <Button label="Remover" variant="ghost" size="sm" disabled={items.length === 0} onPress={() => setItems((current) => current.slice(1))} />
      </View>
      <ListGroup>
        {items.map((id) => (
          <ListItem key={id} title={`Exemplo ${id}`} icon={FileText} animated />
        ))}
      </ListGroup>
      {items.length === 0 && <Text tone="tertiary">Adicione um item para experimentar.</Text>}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Folha">
        <Text tone="secondary">A folha sobe em 400 ms e desce em 240 ms, com véu atrás e sombra nível 3.</Text>
        <Button label="Fechar" fullWidth onPress={() => setSheet(false)} />
      </Sheet>
    </Section>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { flexDirection: 'row', alignItems: 'center', gap: t.space[3.5] },
  mascot: {
    width: t.size.moduleIconLarge,
    height: t.size.moduleIconLarge,
    borderRadius: t.radius.tile,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.navRowTall, paddingVertical: t.space[3] },
  grow: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2], alignItems: 'center' },
  swatch: { width: t.size.swatch, height: t.size.swatch, borderRadius: t.radius.iconSmall },
}));
