// Entrelinha do campo de escrever. No Android ela vira um `LineHeightSpan` por trecho, reaplicado a cada tecla; com
// linhas vazias a altura medida e a desenhada divergiam e o texto pulava a cada tecla (e, antes, chegou a fechar o
// app). Lá o campo usa a altura natural da fonte; iOS e web mantêm a entrelinha do tema.
import { Platform } from 'react-native';

export const editorLineHeight = (lineHeight: number): { lineHeight?: number } => (Platform.OS === 'android' ? {} : { lineHeight });
