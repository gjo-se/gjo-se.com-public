/**
 * DetailTable – Reusable detail view component (key-value rows with inline edit).
 *
 * Visual style matches EXACTLY the AIScope Project Detail metadata table:
 * border-gray-200 container, bg-gray-50 header strip, 160px label column,
 * divide-y rows with hover highlight.
 *
 * Inline edit: click value → Input, blur/Enter → onSave, Escape → cancel.
 */
import Text from '@src/components/primitives/Text';

import DetailRowView from './DetailRowView';
import { CONTAINER, DIVIDER, HEADER } from './DetailTable.utils';

import type { DetailTableProps } from './DetailTable.interface';

/**
 *
 */
export default function DetailTable({ title, rows, onSave, children }: DetailTableProps) {
  return (
    <section>
      <div className={CONTAINER}>
        {/* Header strip */}
        <div className={HEADER}>
          <Text as="span" size="xs" weight="medium" uppercase color="muted">
            {title}
          </Text>
        </div>

        {/* Rows */}
        <div className={DIVIDER}>
          {rows.map((row) => (
            <DetailRowView key={row.field} row={row} onSave={onSave} />
          ))}
          {children}
        </div>
      </div>
    </section>
  );
}

export type { DetailRow } from './DetailTable.types';
export type { DetailTableProps } from './DetailTable.interface';
