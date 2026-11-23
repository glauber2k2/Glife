import * as React from 'react';
export interface VerseProps {
  number: number | string;
  text: React.ReactNode;
  /** 0 gelo, 1 mel, 2 menta, 3 lilás (maps to --hl1..--hl4). null = none. */
  highlight?: 0 | 1 | 2 | 3 | null;
  /** Selected verse → number in --accent-ink. */
  active?: boolean;
  onClick?: () => void;
  /** 20 in the reader, 19 in compact previews. */
  size?: number;
  style?: React.CSSProperties;
}
export declare function Verse(props: VerseProps): JSX.Element;
