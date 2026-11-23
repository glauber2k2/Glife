import * as React from 'react';
export interface AnimatedAmountProps {
  /** Target value; changes animate from the current shown value. */
  value: number;
  /** Initial value on mount. Default 0. */
  from?: number;
  /** Formatter. Default BRL pt-BR (R$ 3.184,20). */
  format?: (v: number) => string;
  /** 44 = display (Light 300, -0.045em); 22 = secondary figure. */
  size?: number;
  duration?: number;
  style?: React.CSSProperties;
}
export declare function AnimatedAmount(props: AnimatedAmountProps): JSX.Element;
