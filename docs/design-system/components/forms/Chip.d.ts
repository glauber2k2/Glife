import * as React from 'react';
export interface ChipProps {
  label: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  /** md = 34px with check reveal (multi-select categories); sm = 32px, no check (single-select filter row). */
  size?: 'md' | 'sm';
  showCheck?: boolean;
  style?: React.CSSProperties;
}
export declare function Chip(props: ChipProps): JSX.Element;
