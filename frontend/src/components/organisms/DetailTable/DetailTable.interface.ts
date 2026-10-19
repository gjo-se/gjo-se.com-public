import type { DetailRow } from './DetailTable.types';
import type { ReactNode } from 'react';


export interface DetailTableProps {
  /** Card title shown in the header strip. */
  title: string;
  /** Key-value rows to display. */
  rows: DetailRow[];
  /** Called on blur/Enter with (field, newValue). */
  onSave: (field: string, value: string) => Promise<void>;
  /** Optional: render custom content below the table rows. */
  children?: ReactNode;
}
