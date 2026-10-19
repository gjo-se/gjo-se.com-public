import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import TableRowActions from '@src/components/table/TableRowActions';

describe('TableRowActions', () => {
  it('renders nothing without any configured action', () => {
    const { container } = render(<TableRowActions />);

    expect(container).toBeEmptyDOMElement();
  });

  it('toggles the active state', async () => {
    const onToggleActive = vi.fn();
    render(<TableRowActions onToggleActive={onToggleActive} isActive />);

    await userEvent.click(screen.getByRole('button', { name: 'Deaktivieren' }));

    expect(onToggleActive).toHaveBeenCalledOnce();
  });

  it('offers the activate label for inactive rows', () => {
    render(<TableRowActions onToggleActive={vi.fn()} isActive={false} />);

    expect(screen.getByRole('button', { name: 'Aktivieren' })).toBeVisible();
  });

  it('runs the test action', async () => {
    const onTest = vi.fn();
    render(<TableRowActions onTest={onTest} />);

    await userEvent.click(screen.getByRole('button', { name: 'Testen' }));

    expect(onTest).toHaveBeenCalledOnce();
  });

  it('opens the confirmation and deletes', async () => {
    const onDelete = vi.fn();
    render(<TableRowActions onDelete={onDelete} deleteConfirmLabel="Wirklich entfernen?" />);

    await userEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    expect(screen.getByText('Wirklich entfernen?')).toBeVisible();

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Löschen' }));

    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('keeps the delete button disabled when configured', () => {
    render(<TableRowActions onDelete={vi.fn()} deleteDisabled deleteDisabledTitle="Nicht löschbar" />);

    expect(screen.getByRole('button', { name: 'Nicht löschbar' })).toBeDisabled();
  });

  it('runs a custom action', async () => {
    const onAction = vi.fn();
    render(
      <TableRowActions
        customActions={[
          { key: 'export', icon: 'download', label: 'Exportieren', onAction, disabled: false, filled: false },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }));

    expect(onAction).toHaveBeenCalledOnce();
  });

  it('renders the edit link when a target route is given', () => {
    render(
      <MemoryRouter>
        <TableRowActions editTo="/admin/test/1" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Bearbeiten' })).toHaveAttribute('href', '/admin/test/1');
  });
});
