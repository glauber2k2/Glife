import * as React from 'react';
export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  /** Label on the left; the switch sits at the right edge. */
  label?: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function Switch(props: SwitchProps): JSX.Element;
