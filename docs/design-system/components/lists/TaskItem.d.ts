import * as React from 'react';
export interface TaskItemProps {
  title: React.ReactNode;
  /** 12.5px caption, e.g. "Vence 25/11 · R$ 1.240,00". */
  meta?: React.ReactNode;
  done?: boolean;
  onToggle?: (done: boolean) => void;
  /** Force collapsed state (controlled). */
  collapsed?: boolean;
  /** Collapse automatically 650ms after done. Default true. */
  autoCollapse?: boolean;
  /** Bottom hairline between rows. */
  divider?: boolean;
  style?: React.CSSProperties;
}
export declare function TaskItem(props: TaskItemProps): JSX.Element;
