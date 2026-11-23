import * as React from 'react';
/** Lucide icon (lucide-static 0.460.0) drawn as a mask in currentColor with 1.5px stroke. */
export interface IconProps {
  /** Lucide kebab-case name, e.g. "sun", "notebook-text", "wallet", "book-open". */
  name: string;
  /** 20 (tabs, actions), 16 (inline, lists) or 13 (link chips). Default 20. */
  size?: 13 | 16 | 18 | 20 | number;
  /** Defaults to currentColor. Use var(--accent-ink) only for selection. */
  color?: string;
  /** Override the SVG base URL (folder containing <name>.svg). Also settable via window.GLIFE_ICON_BASE. */
  base?: string;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element;
