import * as React from 'react';
export interface BottomSheetProps {
  open?: boolean;
  /** Called when the scrim is tapped. */
  onClose?: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function BottomSheet(props: BottomSheetProps): JSX.Element;
