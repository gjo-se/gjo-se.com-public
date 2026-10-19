import type { ReactElement } from 'react';

export interface TableColumnMetaProps {
  width?: string;
  search?: boolean;
  defaultSort?: 'asc' | 'desc';
  filter?: ReactElement | ((state: Record<string, unknown>) => ReactElement);
  compact?: boolean;
  alignment?: 'left' | 'center' | 'right';
}
