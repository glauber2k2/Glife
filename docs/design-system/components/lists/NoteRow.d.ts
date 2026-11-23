import * as React from 'react';
export interface NoteRowLink { icon?: string; label: React.ReactNode; }
export interface NoteRowProps {
  title: React.ReactNode;
  /** "Hoje, 07:12", "Ontem", "22/11". */
  date?: React.ReactNode;
  /** Clamped to 2 lines. */
  excerpt?: React.ReactNode;
  /** Category: Diário, Estudos, Finanças, Casa. */
  tag?: React.ReactNode;
  links?: NoteRowLink[];
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}
export declare function NoteRow(props: NoteRowProps): JSX.Element;
