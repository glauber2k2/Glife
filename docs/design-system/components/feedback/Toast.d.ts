import * as React from 'react';
export interface ToastProps {
  visible?: boolean;
  /** Short past-tense confirmation, e.g. "2 itens criados", "Versículo copiado". */
  message: React.ReactNode;
  /** Lucide name; default "check". Never coloured. */
  icon?: string | null;
  /** Absolute, horizontally centred in the nearest positioned parent. Default true. */
  floating?: boolean;
  /** Bottom offset when floating (86 above a TabBar). */
  bottom?: number;
  style?: React.CSSProperties;
}
export declare function Toast(props: ToastProps): JSX.Element;
