import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import AdminSearchTermsActions from '@src/features/fbf/search-term/components/admin-search-terms-data-table/AdminSearchTermsActions';

describe('AdminSearchTermsActions', () => {
  it('renders the create form with a disabled submit button', () => {
    render(<AdminSearchTermsActions handleCreate={async () => ({})} />);

    expect(screen.getByPlaceholderText('z. B. AI Engineer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anlegen' })).toBeDisabled();
  });

  it('creates a search term and shows the success message', async () => {
    const handleCreate = vi.fn().mockResolvedValue({});
    render(<AdminSearchTermsActions handleCreate={handleCreate} />);

    await userEvent.type(
      screen.getByPlaceholderText('z. B. AI Engineer'),
      'Data Engineer',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Anlegen' }));

    expect(handleCreate).toHaveBeenCalledWith('Data Engineer');
    expect(await screen.findByText('Suchbegriff angelegt.')).toBeInTheDocument();
  });

  it('shows an error message when creation fails', async () => {
    render(
      <AdminSearchTermsActions
        handleCreate={async () => ({ error: 'Bereits vorhanden.' })}
      />,
    );

    await userEvent.type(
      screen.getByPlaceholderText('z. B. AI Engineer'),
      'Data Engineer',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Anlegen' }));

    expect(
      await screen.findByText('Ein unbekannter Fehler ist aufgetreten.'),
    ).toBeInTheDocument();
  });

  it('does not submit a blank name', async () => {
    const handleCreate = vi.fn().mockResolvedValue({});
    render(<AdminSearchTermsActions handleCreate={handleCreate} />);

    await userEvent.type(screen.getByPlaceholderText('z. B. AI Engineer'), '   ');

    expect(screen.getByRole('button', { name: 'Anlegen' })).toBeDisabled();
    expect(handleCreate).not.toHaveBeenCalled();
  });
});
