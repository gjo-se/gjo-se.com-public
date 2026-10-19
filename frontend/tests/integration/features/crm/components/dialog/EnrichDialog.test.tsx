import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import EnrichDialog from '@src/features/crm/components/dialog/EnrichDialog';
import { worker } from '@src/mocks/browser';

function renderDialog(open: boolean, onEnriched = vi.fn(), onOpenChange = vi.fn()) {
  return render(
    <MantineProvider>
      <EnrichDialog open={open} onOpenChange={onOpenChange} onEnriched={onEnriched} />
    </MantineProvider>,
  );
}

describe('EnrichDialog', () => {
  it('renders the enrichment form when open', () => {
    renderDialog(true);

    expect(screen.getByRole('heading', { name: 'Kontaktdaten besorgen' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Max')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mustermann')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('example.com')).toBeInTheDocument();
  });

  it('rejects an incomplete form without calling the API', async () => {
    renderDialog(true);

    fireEvent.click(screen.getByRole('button', { name: 'Kontaktdaten besorgen' }));

    expect(
      await screen.findByText('Vorname, Nachname und Domain sind erforderlich.'),
    ).toBeInTheDocument();
  });

  it('enriches the person and closes on success', async () => {
    const onEnriched = vi.fn();
    const onOpenChange = vi.fn();
    renderDialog(true, onEnriched, onOpenChange);

    fireEvent.change(screen.getByPlaceholderText('Max'), { target: { value: 'Max' } });
    fireEvent.change(screen.getByPlaceholderText('Mustermann'), { target: { value: 'Mustermann' } });
    fireEvent.change(screen.getByPlaceholderText('example.com'), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kontaktdaten besorgen' }));

    await waitFor(() => expect(onEnriched).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the dialog open when the API fails', async () => {
    worker.use(
      http.post('/api/v1/admin/crm/persons/enrich', () => HttpResponse.json(null, { status: 500 })),
    );
    const onEnriched = vi.fn();
    const onOpenChange = vi.fn();
    renderDialog(true, onEnriched, onOpenChange);

    fireEvent.change(screen.getByPlaceholderText('Max'), { target: { value: 'Max' } });
    fireEvent.change(screen.getByPlaceholderText('Mustermann'), { target: { value: 'Mustermann' } });
    fireEvent.change(screen.getByPlaceholderText('example.com'), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kontaktdaten besorgen' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Kontaktdaten besorgen' })).toBeEnabled(),
    );
    expect(onEnriched).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
