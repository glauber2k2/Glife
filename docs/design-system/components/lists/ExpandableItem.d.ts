import * as React from 'react';
export interface ItemLink { icon?: string; label: React.ReactNode; }
export interface ExpandableItemProps {
  /** Lucide name in a 34px outlined circle. */
  icon?: string;
  title: React.ReactNode;
  /** e.g. "Ontem, 19:42 · Mercado". */
  meta?: React.ReactNode;
  /** Pre-formatted, e.g. "− R$ 186,40" or "+ R$ 6.800,00". */
  amount?: React.ReactNode;
  /** Income → amount in --ok. */
  positive?: boolean;
  links?: ItemLink[];
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  style?: React.CSSProperties;
}
export declare function ExpandableItem(props: ExpandableItemProps): JSX.Element;
