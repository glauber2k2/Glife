import * as React from 'react';
export interface TextFieldProps {
  /** Floating label text (sentence case, pt-BR). */
  label: string;
  value?: string;
  defaultValue?: string;
  /** Receives the new string value. */
  onChange?: (value: string) => void;
  /** Error message shown below; turns border + label --err. */
  error?: string;
  type?: string;
  inputMode?: 'text' | 'decimal' | 'numeric' | 'email' | 'tel' | 'search';
  /** Tabular numerals for money/time. */
  numeric?: boolean;
  style?: React.CSSProperties;
}
export declare function TextField(props: TextFieldProps): JSX.Element;
