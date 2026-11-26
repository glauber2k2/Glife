import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon } from './Icon';
import { Text } from './Text';
import { makeStyles, moduleColors, moduleHue, useTheme, type ModuleKey } from './theme';
import { usePress } from './usePress';

export interface ModuleTileProps {
  label: string;
  icon: LucideIcon;
  module: ModuleKey;
  onPress: () => void;
}

/** Bloco de atalho de "Seus espaços": ícone de 24 num bloco r20 de 60 px no matiz do módulo, nome embaixo. */
export function ModuleTile({ label, icon, module, onPress }: ModuleTileProps) {
  const s = useStyles();
  const t = useTheme();
  const press = usePress();
  const colors = moduleColors(moduleHue[module], t.scheme);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={s.wrap}>
      <Animated.View style={[s.tile, press.style]}>
        <View style={[s.block, { backgroundColor: colors.soft }]}>
          <Icon icon={icon} size={t.icon.tile} rawColor={colors.strong} />
        </View>
        <Text variant="micro" numberOfLines={1} style={s.label}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** Grade de atalhos: 4 por linha no celular. */
export function ModuleTiles({ children }: { children: React.ReactNode }) {
  const s = useStyles();
  return <View style={s.grid}>{children}</View>;
}

const useStyles = makeStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: t.space[3], marginHorizontal: -t.space[1] - t.hairline },
  wrap: { width: '25%', paddingHorizontal: t.space[1] + t.hairline },
  tile: { alignItems: 'center', gap: t.space[1.5] },
  block: { alignSelf: 'stretch', height: t.size.tileHeight, borderRadius: t.radius.tile, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: t.type.chip.font },
}));
