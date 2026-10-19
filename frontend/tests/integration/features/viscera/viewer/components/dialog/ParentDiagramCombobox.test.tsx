import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ParentDiagramCombobox from '@src/features/viscera/viewer/components/dialog/ParentDiagramCombobox';

import { makeObject, makeWorkspace, renderWithWorkspace } from '../../../visceraTestUtils';

const WORKSPACE = makeWorkspace({
  objects: [
    makeObject({ id: 'backend', name: 'Backend', type: 'container' }),
    makeObject({ id: 'core', name: 'Core', type: 'container' }),
    makeObject({ id: 'database', name: 'Database', type: 'store' }),
    makeObject({ id: 'shop', name: 'Shop', type: 'system' }),
  ],
});

function renderCombobox(overrides: Partial<Parameters<typeof ParentDiagramCombobox>[0]> = {}) {
  const props = {
    diagramType: 'component',
    value: null,
    onChange: vi.fn(),
    ...overrides,
  };
  renderWithWorkspace(<ParentDiagramCombobox {...props} />, { workspace: WORKSPACE });
  return props;
}

describe('ParentDiagramCombobox', () => {
  it('explains that a system context has no parent', () => {
    renderCombobox({ diagramType: 'systemContext' });

    expect(screen.getByText('Parent')).toBeInTheDocument();
    expect(
      screen.getByText('Kein Parent für diesen Diagramm-Typ verfügbar.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('offers only systems as parents for a container diagram', () => {
    renderCombobox({ diagramType: 'container' });

    fireEvent.click(screen.getByRole('combobox', { name: /Parent/ }));

    expect(screen.getByText('Shop')).toBeInTheDocument();
    expect(screen.queryByText('Backend')).toBeNull();
    expect(screen.queryByText('Database')).toBeNull();
  });

  it('offers containers and stores as parents for a component diagram', () => {
    renderCombobox({ diagramType: 'component' });

    fireEvent.click(screen.getByRole('combobox', { name: /Parent/ }));

    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Core')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.queryByText('Shop')).toBeNull();
  });

  it('reports the selected parent id and clears it for the empty option', () => {
    const view = renderCombobox({ diagramType: 'container' });

    fireEvent.click(screen.getByRole('combobox', { name: /Parent/ }));
    fireEvent.click(screen.getByRole('option', { name: /Shop/ }));

    expect(view.onChange).toHaveBeenCalledWith('shop');
  });

  it('can be disabled', () => {
    renderCombobox({ diagramType: 'container', disabled: true });

    expect(screen.getByRole('combobox', { name: /Parent/ })).toHaveAttribute('disabled');
  });
});
