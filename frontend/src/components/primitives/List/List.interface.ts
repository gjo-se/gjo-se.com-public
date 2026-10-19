import type { ListVariants } from './List.variants';
import type { ReactNode } from 'react';

export interface ListProps extends Omit<ListVariants, 'className' | 'style'> {
  as?: 'ul' | 'ol' | 'dl';
  items?: ReactNode[];
  definitions?: { dt: string; dd: ReactNode }[];
  /**
   * Semantische Items direkt (`li`/`dt`/`dd` – nicht im Atom-Mapping) für komplexe
   * Einträge mit exakter Klassenkontrolle; überschreibt `items`/`definitions`.
   */
  children?: React.ReactNode;
}
