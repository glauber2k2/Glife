import * as React from 'react';
export interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  /** Optional 15px label to the right. */
  label?: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;
