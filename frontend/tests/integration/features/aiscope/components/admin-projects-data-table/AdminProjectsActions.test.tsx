import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AdminProjectsActions from '@src/features/aiscope/components/admin-projects-data-table/AdminProjectsActions';

const actions = { handleScrape: vi.fn(), setMaxResults: vi.fn() };

function renderActions(state: {
  scraperStatus: 'idle' | 'running' | 'done' | 'error';
  maxResults: string;
  savedCount: number | null;
  canScrape: boolean;
}) {
  return render(<AdminProjectsActions state={state} actions={actions} />);
}

describe('AdminProjectsActions', () => {
  it('shows the idle scrape label and forwards the result limit', () => {
    const setMaxResults = vi.fn();
    render(
      <AdminProjectsActions
        state={{ scraperStatus: 'idle', maxResults: '50', savedCount: null, canScrape: true }}
        actions={{ ...actions, setMaxResults }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Jetzt scrapen + normalisieren' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '10' } });

    expect(setMaxResults).toHaveBeenCalledWith('10');
  });

  it('disables the scrape button while the scraper runs', () => {
    renderActions({ scraperStatus: 'running', maxResults: '', savedCount: null, canScrape: true });

    expect(screen.getByRole('button', { name: 'Läuft…' })).toBeDisabled();
  });

  it('disables the scrape button when scraping is not allowed', () => {
    renderActions({ scraperStatus: 'idle', maxResults: '', savedCount: null, canScrape: false });

    expect(screen.getByRole('button', { name: 'Jetzt scrapen + normalisieren' })).toBeDisabled();
  });

  it('summarises the number of newly saved projects when done', () => {
    renderActions({ scraperStatus: 'done', maxResults: '', savedCount: 7, canScrape: true });

    expect(screen.getByRole('button', { name: '✓ 7 neu' })).toBeEnabled();
  });

  it('shows the error label after a failed run and triggers the scrape', () => {
    const handleScrape = vi.fn().mockResolvedValue(undefined);
    render(
      <AdminProjectsActions
        state={{ scraperStatus: 'error', maxResults: '', savedCount: null, canScrape: true }}
        actions={{ handleScrape, setMaxResults: vi.fn() }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fehler' }));

    expect(handleScrape).toHaveBeenCalledTimes(1);
  });
});
