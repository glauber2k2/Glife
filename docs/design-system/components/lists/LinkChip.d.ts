import * as React from 'react';
export interface LinkChipProps {
  /** Lucide name: book-open (verse), receipt (expense), image (photo), notebook-text (note), calendar, credit-card, wallet. */
  icon?: string;
  label: React.ReactNode;
  /** md = 26px (expanded rows), sm = 22px (note list). */
  size?: 'md' | 'sm';
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function LinkChip(props: LinkChipProps): JSX.Element;
