/**
 * Tests: useBreadcrumbs – path-derived breadcrumb items with tail override and
 * the noBreadcrumb contract.
 */
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useBreadcrumbs } from '@src/hooks/useBreadcrumbs';

import type { ReactNode } from 'react';

function Probe({ tail }: { tail?: string | null }) {
  const items = useBreadcrumbs(tail);

  return createElement(
    'ol',
    null,
    items.map((item, index) =>
      createElement(
        'li',
        { key: `${item.label}-${index}`, 'data-testid': `item-${index}`, 'data-to': item.to ?? '' },
        item.label,
      ),
    ),
  );
}

function renderAt(path: string, tail?: string | null): void {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [path] }, children);

  render(createElement(Probe, { tail }), { wrapper });
}

describe('useBreadcrumbs', () => {
  it('builds Home plus the path segments and omits the link on the last item', () => {
    renderAt('/admin/llm/task');

    expect(screen.getByTestId('item-0').textContent).toBe('Home');
    expect(screen.getByTestId('item-0').getAttribute('data-to')).toBe('/');
    expect(screen.getByTestId('item-1').textContent).toBe('admin');
    expect(screen.getByTestId('item-2').textContent).toBe('llm');
    expect(screen.getByTestId('item-3').textContent).toBe('LLM Tasks');
    expect(screen.getByTestId('item-3').getAttribute('data-to')).toBe('');
  });

  it('overrides the last label with the dynamic tail', () => {
    renderAt('/admin/llm/task/merge_description', 'Merge Description');

    expect(screen.getByTestId('item-4').textContent).toBe('Merge Description');
  });

  it('uses English links and root for the EN locale', () => {
    renderAt('/en/admin/llm');

    expect(screen.getByTestId('item-0').textContent).toBe('Home');
    expect(screen.getByTestId('item-0').getAttribute('data-to')).toBe('/en');
    expect(screen.getByTestId('item-1').textContent).toBe('admin');
    expect(screen.getByTestId('item-1').getAttribute('data-to')).toBe('/en/admin');
  });

  it('returns no items for a noBreadcrumb route', () => {
    renderAt('/fbf/skill');

    expect(screen.queryByTestId('item-0')).toBeNull();
  });

  it('returns no items on the root path', () => {
    renderAt('/');

    expect(screen.queryByTestId('item-0')).toBeNull();
  });
});
