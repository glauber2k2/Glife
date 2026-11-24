import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Icon } from './Icon';
import { makeStyles, useTheme } from './theme';
import { noFocusRing } from './webStyles';

export interface SearchFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Enter / botão de busca do teclado */
  onSubmit?: () => void;
}

/** Busca em pílula (46 px) com ícone à esquerda; a borda e o ícone ganham o destaque no foco. */
export function SearchField({ value, onChangeText, placeholder = 'Buscar', autoFocus, onSubmit }: SearchFieldProps) {
  const s = useStyles();
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.root, focused && s.focused]}>
      <Icon icon={Search} size={t.icon.small} color={focused ? 'accentInk' : 'textTertiary'} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textTertiary}
        selectionColor={t.colors.accent}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoFocus={autoFocus}
        onSubmitEditing={onSubmit}
        autoCorrect={false}
        style={[s.input, noFocusRing]}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2] + t.space[0.5],
    height: t.size.search,
    paddingHorizontal: t.space[4],
    borderRadius: t.radius.full,
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
  },
  focused: { borderColor: t.colors.accent },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    color: t.colors.text,
    fontFamily: t.type.body.font,
    fontSize: t.type.body.fontSize,
  },
}));
