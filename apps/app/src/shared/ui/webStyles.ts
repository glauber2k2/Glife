import { Platform, type TextStyle } from 'react-native';

/**
 * Na web o foco de campos é a própria borda (azul); sem o anel padrão do navegador por cima.
 * `outlineStyle: 'none'` existe no react-native-web, mas não nos tipos do React Native.
 */
export const noFocusRing: TextStyle | undefined =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : undefined;
