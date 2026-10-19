import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import DetailPageShell from '@src/components/molecules/DetailPageShell/DetailPageShell';

function renderShell(overrides: Partial<React.ComponentProps<typeof DetailPageShell>> = {}) {
  return render(
    <MemoryRouter>
      <DetailPageShell
        backTo="/admin/projects"
        prevId={10}
        nextId={20}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        {...overrides}
      >
        <p>Detail-Inhalt</p>
      </DetailPageShell>
    </MemoryRouter>,
  );
}

describe('DetailPageShell', () => {
  it('renders the back link, the pager and the children', () => {
    renderShell();

    expect(screen.getByRole('link', { name: '← Zurück zur Liste' })).toHaveAttribute(
      'href',
      '/admin/projects',
    );
    expect(screen.getByLabelText('Vorheriges Projekt')).toBeEnabled();
    expect(screen.getByText('Detail-Inhalt')).toBeVisible();
  });

  it('disables the pager controls when no neighbour exists', () => {
    renderShell({ prevId: null, nextId: null });

    expect(screen.getByLabelText('Vorheriges Projekt')).toBeDisabled();
    expect(screen.getByLabelText('Nächstes Projekt')).toBeDisabled();
  });

  it('reports pager navigation through the injected handlers', async () => {
    const onNext = vi.fn();
    renderShell({ onNext });

    await userEvent.click(screen.getByLabelText('Nächstes Projekt'));

    expect(onNext).toHaveBeenCalledOnce();
  });
});
