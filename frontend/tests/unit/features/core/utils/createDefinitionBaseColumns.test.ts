/**
 * Tests: createDefinitionBaseColumns
 *
 * Verifies the shared base column contract: the name placeholder, searchable/
 * sortable flags, default sort and numeric alignment.
 */

import { describe, expect, it } from 'vitest';

import { createDefinitionBaseColumns } from '@src/features/core/utils/createDefinitionBaseColumns';

describe('createDefinitionBaseColumns', () => {
  it('exposes all shared definition columns', () => {
    const columns = createDefinitionBaseColumns('Name…');

    expect(Object.keys(columns)).toEqual([
      'name',
      'category',
      'color_token',
      'description',
      'sort_order',
      'usage_count',
      'scope',
    ]);
  });

  it('wires the placeholder and search into the name column', () => {
    const columns = createDefinitionBaseColumns('Status-Name…');

    expect(columns.name).toMatchObject({
      label: 'Name',
      search: true,
      sortable: true,
      defaultSort: 'asc',
      ghostInput: 'text',
      ghostPlaceholder: 'Status-Name…',
      inlineEdit: true,
    });
  });

  it('keeps the numeric columns right-aligned', () => {
    const columns = createDefinitionBaseColumns('Name…');

    expect(columns.sort_order).toMatchObject({ width: '80px', alignment: 'right', sortable: true });
    expect(columns.usage_count).toMatchObject({ width: '80px', alignment: 'right', sortable: true });
  });
});
