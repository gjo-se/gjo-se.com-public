import { render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import CookieBanner from '@src/components/molecules/CookieBanner/CookieBanner';
import { worker } from '@src/mocks/browser';

function renderBanner(isVisible: boolean, onDismiss = vi.fn()) {
  worker.use(http.get('/api/v1/public/content/de', () => HttpResponse.json({})));
  return render(
    <MemoryRouter>
      <CookieBanner isVisible={isVisible} onDismiss={onDismiss} />
    </MemoryRouter>,
  );
}

describe('CookieBanner', () => {
  it('renders nothing while hidden', () => {
    const { container } = renderBanner(false);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the informational banner with the privacy link', async () => {
    renderBanner(true);

    expect(await screen.findByRole('region', { name: 'Cookie-Hinweis' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Datenschutzerklärung' })).toBeVisible();
  });

  it('dismisses the banner through the accept button', async () => {
    const onDismiss = vi.fn();
    renderBanner(true, onDismiss);

    await userEvent.click(await screen.findByRole('button', { name: 'Verstanden' }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
