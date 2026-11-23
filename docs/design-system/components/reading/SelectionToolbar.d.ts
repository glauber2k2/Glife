import * as React from 'react';
export interface SelectionAction { icon: string; label: string; onClick?: () => void; }
export interface SelectionToolbarProps {
  open?: boolean;
  /** Selected highlighter index 0–3. */
  color?: number;
  onColor?: (index: number) => void;
  /** Typically Anotar (pencil-line), Copiar (copy), Remover marca (trash-2), Pronto (check). */
  actions?: SelectionAction[];
  swatchCount?: number;
  /** Absolutely positioned; override bottom to sit above a TabBar (e.g. bottom: 82). */
  style?: React.CSSProperties;
}
export declare function SelectionToolbar(props: SelectionToolbarProps): JSX.Element;
