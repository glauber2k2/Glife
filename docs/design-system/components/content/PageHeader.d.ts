import * as React from 'react';
export interface PageHeaderProps {
  /** 12.5/500 caption above the title, e.g. "Domingo, 22 de novembro". */
  eyebrow?: React.ReactNode;
  /** 34px Light title, e.g. "Hoje". */
  title: React.ReactNode;
  /** Crimson Pro italic subtitle (reading screens only), e.g. "Salmo de Davi". */
  subtitle?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function PageHeader(props: PageHeaderProps): JSX.Element;
