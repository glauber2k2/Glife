import * as React from 'react';
export interface ProgressTrackProps {
  value: number;
  max?: number;
  /** Percent above which the fill turns --warn. Default 90. */
  warnAt?: number;
  /** 3 (budget) or 2 (category rows). */
  height?: number;
  /** Force a colour, e.g. var(--ink3) for non-leading categories. */
  color?: string;
  /** Transition delay in ms. */
  delay?: number;
  style?: React.CSSProperties;
}
export declare function ProgressTrack(props: ProgressTrackProps): JSX.Element;
