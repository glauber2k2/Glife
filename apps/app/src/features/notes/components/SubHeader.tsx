import { ChevronLeft, Plus } from 'lucide-react-native';
import { View } from 'react-native';

import { IconButton, Text, makeStyles } from '@/shared/ui';

import { goBack } from '../hooks/useNoteActions';

/** Cabeçalho das subtelas de Notas: voltar, ação + opcional, rótulo pequeno e título 34/300. */
export function SubHeader({
  eyebrow,
  title,
  text,
  plusLabel,
  onPlus,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  plusLabel?: string;
  onPlus?: () => void;
}) {
  const s = useStyles();
  return (
    <View>
      <View style={s.bar}>
        <View style={s.back}>
          <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onPress={() => goBack()} />
        </View>
        {onPlus && plusLabel && <IconButton icon={Plus} label={plusLabel} onPress={onPlus} />}
      </View>
      <View style={s.titles}>
        <Text variant="eyebrow" tone="tertiary">
          {eyebrow}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {text && (
          <Text variant="small" tone="tertiary">
            {text}
          </Text>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    height: t.size.editorBar,
    marginTop: -t.space[6],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { marginLeft: -(t.space[2] + t.space[0.5]) },
  titles: { gap: t.space[1.5] },
}));
