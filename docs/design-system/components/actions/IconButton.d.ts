import * as React from 'react';
export interface IconButtonProps {
  /** Lucide icon name. */
  icon: string;
  /** Accessible label / tooltip (pt-BR). */
  label?: string;
  /** outline = 1px line ring; plain = no border (back buttons); inverse = on the dark --ink1 toolbar. */
  variant?: 'outline' | 'plain' | 'inverse';
  /** Diameter in px. 40 default, 48 large, 36 in toolbars. */
  size?: number;
  iconSize?: number;
  color?: string;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
