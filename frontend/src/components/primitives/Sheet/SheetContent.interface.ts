export interface SheetContentProps {
  children?: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  [key: string]: unknown;
}
