import * as React from 'react';
export interface TabItem { key: string; label: string; /** Lucide name */ icon: string; }
export interface TabBarProps {
  /** Exactly four tabs; Glife uses Hoje (sun), Notas (notebook-text), Finanças (wallet), Bíblia (book-open). */
  items: TabItem[];
  value: string;
  onChange?: (key: string) => void;
  /** Centre + button (opens Caixa de entrada). */
  onPlus?: () => void;
  plusLabel?: string;
  style?: React.CSSProperties;
}
export declare function TabBar(props: TabBarProps): JSX.Element;
