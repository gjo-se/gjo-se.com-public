import type { ReactNode } from 'react';

export interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onReset: () => void;
  total: number;
  loading: boolean;
  searchPlaceholder?: string;
  filterElements?: React.ReactElement[];
  children?: ReactNode;
}
