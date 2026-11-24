import { router, type Href } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { View } from 'react-native';

import { IconButton } from './IconButton';
import { Text } from './Text';
import { makeStyles, useTheme } from './theme';

export interface BackHeaderProps {
  title: string;
  /** o que o leitor de tela anuncia no botão (ex.: o nome da tela anterior) */
  backLabel?: string;
  /** para onde ir quando não há histórico (tela aberta direto pelo endereço) */
  fallback?: Href;
}

/** Voltar (44 px) e título 34/300 das telas empilhadas (Ajustes, Segurança, Trocar a senha). */
export function BackHeader({ title, backLabel = 'Voltar', fallback = '/ajustes' }: BackHeaderProps) {
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
            onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
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
