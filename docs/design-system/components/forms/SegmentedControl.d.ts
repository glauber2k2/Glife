import * as React from 'react';
export interface SegmentedOption { value: string; label: React.ReactNode; }
export interface SegmentedControlProps {
  options: Array<string | SegmentedOption>;
  value: string;
  onChange?: (value: string) => void;
  /** md = 12.5px text, outlined indicator; sm = 12px, used inline in section headers (Out / Nov). */
  size?: 'md' | 'sm';
  fullWidth?: boolean;
  style?: React.CSSProperties;
}
export declare function SegmentedControl(props: SegmentedControlProps): JSX.Element;
