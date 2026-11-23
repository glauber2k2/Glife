import * as React from 'react';
export interface ButtonProps {
  /** primary = accent fill (one per screen); secondary = 1px line outline; ghost = accent text only. */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** md = 48px tall, 15px text; sm = 40px tall, 14px text. */
  size?: 'md' | 'sm';
  /** Lucide icon name shown before the label at 16px. */
  icon?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
