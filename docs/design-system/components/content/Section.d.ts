import * as React from 'react';
export interface SectionProps {
  /** Uppercase eyebrow label, e.g. "Próximo compromisso". */
  label?: React.ReactNode;
  /** Right-aligned element in the label row (SegmentedControl, chevron…). */
  action?: React.ReactNode;
  /** 1px top hairline. Default true. */
  divider?: boolean;
  /** Default "18px 0". */
  padding?: string | number;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Section(props: SectionProps): JSX.Element;
