/**
 * createDefinitionBaseColumns – gemeinsame Basis-Spaltendefinitionen der
 * Core-Definitions-Tabellen (Tags/Status).
 *
 * Die Spalten sind zwischen Tag und Status identisch; einziger Unterschied ist
 * der Ghost-Platzhalter des Namensfeldes. Die tag-/statusspezifischen Renderer
 * (Color-Token, Scope, Usage) ergänzt `buildDefinitionColumns` darauf.
 */
import type { TableColumnProps } from '@src/components/table';

/** Base columns shared by the tag/status definition tables. */
export function createDefinitionBaseColumns(namePlaceholder: string): Record<string, TableColumnProps> {
  return {
    name: {
      label: 'Name',
      search: true,
      sortable: true,
      defaultSort: 'asc',
      ghostInput: 'text',
      ghostPlaceholder: namePlaceholder,
      inlineEdit: true,
    },
    category: {
      label: 'Kategorie',
      sortable: true,
      ghostInput: 'text',
      ghostPlaceholder: 'Kategorie…',
      inlineEdit: true,
    },
    color_token: {
      label: 'Farbe',
      sortable: true,
    },
    description: {
      label: 'Beschreibung',
      inlineEdit: true,
      ghostInput: 'text',
      ghostPlaceholder: 'Beschreibung…',
    },
    sort_order: {
      label: 'Sortierung',
      sortable: true,
      inlineEdit: true,
      width: '80px',
      alignment: 'right',
    },
    usage_count: {
      label: 'Verwendet',
      sortable: true,
      width: '80px',
      alignment: 'right',
    },
    scope: {
      label: 'Scope',
    },
  };
}
