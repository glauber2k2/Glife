import { APP_PASSWORD_MAX, APP_PASSWORD_MIN } from '@glife/domain/applock';
import { Circle, CircleAlert, CircleCheck, Eye, EyeOff, Timer, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode, type Ref } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  IconButton,
  Icon,
  Input,
  Text,
  makeStyles,
  useReduceMotion,
  useTheme,
  type InputProps,
} from '@/shared/ui';

/** Campo de senha com "Mostrar senha". Nada de preenchimento automático: é a senha do app, não a da conta. */
export function PasswordInput({
  inputRef,
  disabled,
  ...rest
}: Omit<InputProps, 'secureTextEntry' | 'trailing' | 'ref'> & { inputRef?: Ref<TextInput>; disabled?: boolean }) {
  const s = useStyles();
  const t = useTheme();
  const [show, setShow] = useState(false);
  return (
    <View style={disabled && s.disabled}>
      <Input
        ref={inputRef}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        importantForAutofill="no"
        textContentType="none"
        maxLength={APP_PASSWORD_MAX}
        editable={!disabled}
        trailing={
          <IconButton
            icon={show ? EyeOff : Eye}
            label={show ? 'Esconder senha' : 'Mostrar senha'}
            variant="ghost"
            size={t.touch.minTarget}
            color="textTertiary"
            disabled={disabled}
            onPress={() => setShow((v) => !v)}
          />
        }
        {...rest}
      />
    </View>
  );
}

/** "Pelo menos 6 caracteres": círculo vazio em terciário; cumprida, em verde. */
export function LengthRule({ value }: { value: string }) {
  const s = useStyles();
  const t = useTheme();
  const ok = value.length >= APP_PASSWORD_MIN;
  return (
    <View style={s.rule}>
      <Icon icon={ok ? CircleCheck : Circle} size={t.icon.small} color={ok ? 'success' : 'textTertiary'} />
      <Text variant="small" tone={ok ? 'success' : 'tertiary'}>
        Pelo menos {APP_PASSWORD_MIN} caracteres
      </Text>
    </View>
  );
}

const MESSAGE_ICON: Record<'error' | 'wait', LucideIcon> = { error: CircleAlert, wait: Timer };

/** Mensagem do bloqueio: ícone de 16 px, texto e uma linha discreta abaixo. Sempre no mesmo lugar. */
export function LockMessage({
  kind,
  children,
  sub,
  timer,
}: {
  kind: 'error' | 'wait';
  children: ReactNode;
  sub?: string;
  /** a contagem regressiva não é lida a cada segundo */
  timer?: boolean;
}) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const tone = kind === 'error' ? 'danger' : 'warning';
  return (
    <Animated.View
      accessibilityRole={timer ? 'timer' : 'alert'}
      accessibilityLiveRegion={timer ? 'none' : 'polite'}
      entering={reduceMotion ? undefined : FadeIn.duration(t.motion.gentle)}
      exiting={reduceMotion ? undefined : FadeOut.duration(t.motion.tap)}
      style={s.message}
    >
      <View style={s.messageIcon}>
        <Icon icon={MESSAGE_ICON[kind]} size={t.icon.small} color={tone} />
      </View>
      <View style={s.messageText}>
        <Text variant="small" tone={tone}>
          {children}
        </Text>
        {sub && (
          <Text variant="caption" tone="tertiary" numeric>
            {sub}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  disabled: { opacity: t.opacity.fieldDisabled, backgroundColor: t.colors.soft, borderRadius: t.radius.field },
  rule: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], paddingLeft: t.space[0.5] },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space[2] },
  messageIcon: { paddingTop: t.space[0.5] },
  messageText: { flex: 1, gap: t.space[0.5] },
}));
