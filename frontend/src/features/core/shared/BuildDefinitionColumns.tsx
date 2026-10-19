/**
 * buildDefinitionColumns – baut die erweiterten Spalten der Core-Definitions-
 * Tabellen (Tags/Status): farbiger Color-Token-Zelle, Scope-Zelle und Usage-Zelle.
 *
 * Kapselt die in `TagDefinitionListPage`/`StatusDefinitionListPage` kopierte
 * Spalten-Erweiterung; Aufrufer liefern nur `update`, `refreshData`, `typeKind`
 * und optional `renderUsage`.
 */

import Text from '@src/components/primitives/Text';
import type { TableColumnProps } from '@src/components/table';

import ColorTokenCell from './ColorTokenCell';
import ScopeCell from './ScopeCell';

import type { ReactNode } from 'react';

export interface DefinitionColumnOptions {
  /** Partial update for inline edits (color_token / scope). */
  update: (id: number, patch: Record<string, unknown>) => Promise<unknown>;
  /** Refetches data after a successful edit. */
  refreshData: () => Promise<void>;
  /** Scope cell kind: taggable (tags) or statusable (status). */
  typeKind: 'taggable' | 'statusable';
  /** Optional custom usage cell; defaults to plain text (muted at 0). */
  renderUsage?: (row: Record<string, unknown>, count: number) => ReactNode;
}

/** Merges the color/scope/usage renderers into the base column definitions. */
export function buildDefinitionColumns(
  base: Record<string, TableColumnProps>,
  opts: DefinitionColumnOptions,
): Record<string, TableColumnProps> {
  return {
    ...base,
    color_token: {
      ...base.color_token,
      renderCell: (row: Record<string, unknown>) => {
        const currentColor = String(row.color_token ?? 'gray');
        return (
          <ColorTokenCell
            value={currentColor}
            onSave={async (next: string) => {
              if (currentColor === next) return;
              await opts.update(row.id as number, { color_token: next });
              await opts.refreshData();
            }}
          />
        );
      },
      ghostRenderCell: ({ value, onChange }) => (
        <ColorTokenCell
          value={value ? String(value) : 'gray'}
          onSave={async (next: string) => {
            onChange(next);
          }}
        />
      ),
    },
    scope: {
      ...base.scope,
      renderCell: (row: Record<string, unknown>) => (
        <ScopeCell
          value={(row['scope'] as string[]) ?? []}
          onSave={async (next: string[]) => {
            await opts.update(row.id as number, { scope: next.length > 0 ? next : null });
            await opts.refreshData();
          }}
          typeKind={opts.typeKind}
        />
      ),
      ghostRenderCell: ({ value, onChange }) => (
        <ScopeCell
          value={Array.isArray(value) ? (value as string[]) : []}
          onSave={async (next: string[]) => {
            onChange(next);
          }}
          typeKind={opts.typeKind}
        />
      ),
    },
    usage_count: {
      ...base.usage_count,
      renderCell: (row: Record<string, unknown>) => {
        const count = Number(row.usage_count ?? 0);
        if (opts.renderUsage) return opts.renderUsage(row, count);
        return (
          <Text as="span" size="sm" color={count === 0 ? 'muted' : undefined}>
            {String(count)}
          </Text>
        );
      },
    },
  };
}
