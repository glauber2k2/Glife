import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { View } from 'react-native';

import { IconButton, Text, makeStyles, useTheme } from '@/shared/ui';

/** Voltar (44 px) e título 34/300 das subtelas de Segurança. */
export function BackHeader({ title, backLabel = 'Voltar' }: { title: string; backLabel?: string }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View>
      <View style={s.bar}>
        <View style={s.back}>
          <IconButton
            icon={ChevronLeft}
            label={backLabel}
            variant="ghost"
            size={t.touch.minTarget}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/ajustes'))}
          />
        </View>
      </View>
      <Text variant="title" accessibilityRole="header" style={s.title}>
        {title}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: { height: t.size.editorBar, marginTop: -t.space[6], flexDirection: 'row', alignItems: 'center' },
  back: { marginLeft: -(t.space[2] + t.space[0.5]) },
  title: { paddingTop: t.space[4] },
}));
