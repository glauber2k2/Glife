import { CircleAlert, Timer, WifiOff, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon, Text, makeStyles, useReduceMotion, useTheme, type IconColor } from '@/shared/ui';

import type { AuthMessage as Message, AuthMessageIcon, AuthMessageTone } from '../hooks/messages';

const ICONS: Record<AuthMessageIcon, LucideIcon> = { alert: CircleAlert, offline: WifiOff, wait: Timer };
const ICON_COLOR: Record<AuthMessageTone, IconColor> = { danger: 'danger', secondary: 'textSecondary', warning: 'warning' };

/** Mensagem com ícone de 16 px, sempre no mesmo lugar e anunciada ao leitor de tela. */
export function AuthMessage({ message }: { message: Message }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      entering={reduceMotion ? undefined : FadeIn.duration(t.motion.gentle)}
      exiting={reduceMotion ? undefined : FadeOut.duration(t.motion.tap)}
      style={s.row}
    >
      <View style={s.icon}>
        <Icon icon={ICONS[message.icon]} size={t.icon.small} color={ICON_COLOR[message.tone]} />
      </View>
      <Text variant="small" tone={message.tone} style={s.text}>
        {message.text}
      </Text>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: t.space[2], alignItems: 'flex-start', paddingVertical: t.space[1] },
  icon: { paddingTop: t.space[0.5] },
  text: { flex: 1 },
}));
