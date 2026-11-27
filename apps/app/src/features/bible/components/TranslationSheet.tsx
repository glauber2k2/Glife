// Escolha rápida da tradução (no início da Bíblia e no leitor): as embutidas e as importadas neste aparelho.
// Grifos e notas ficam presos à referência, então aparecem em qualquer tradução.
import { Check, Download } from 'lucide-react-native';
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, Icon, ListGroup, Sheet, Text, makeStyles, useTheme } from '@/shared/ui';

import { useBibleText } from '../hooks/BibleData';

export function TranslationSheet({ visible, onClose }: { visible: boolean; onClose(): void }) {
  const s = useStyles();
  const t = useTheme();
  const { translations, translation, setTranslation } = useBibleText();
  return (
    <Sheet visible={visible} onClose={onClose} title="Tradução" subtitle="Suas marcações e notas aparecem em todas.">
      <View style={s.body}>
        <ListGroup>
          {translations.map((tr) => {
            const on = tr.id === translation.id;
            return (
              <Pressable
                key={tr.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${tr.name} (${tr.abbr})`}
                onPress={() => {
                  setTranslation(tr.id);
                  onClose();
                }}
                style={s.row}
              >
                <View style={s.texts}>
                  <Text variant="item">{tr.name}</Text>
                  <Text variant="caption" tone="tertiary">
                    {tr.abbr} · {tr.source === 'bundled' ? 'vem no app' : 'só neste aparelho'}
                  </Text>
                </View>
                <View style={{ opacity: on ? t.opacity.full : t.opacity.hidden }}>
                  <Icon icon={Check} color="accentInk" />
                </View>
              </Pressable>
            );
          })}
        </ListGroup>
        <Button
          label="Importar tradução"
          icon={Download}
          variant="secondary"
          onPress={() => {
            onClose();
            router.push('/biblia/traducoes' as Href);
          }}
        />
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  body: { gap: t.space[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.navRow, paddingVertical: t.space[2], paddingHorizontal: t.space[4] },
  texts: { flex: 1, gap: t.space[0.5] },
}));
