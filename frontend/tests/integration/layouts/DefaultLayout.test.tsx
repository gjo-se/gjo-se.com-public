import { screen, within } from '@testing-library/react';
import { Route } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import DefaultLayout from '@src/layouts/DefaultLayout';

import { mockPublicContent, renderPublicRoutes } from '../pages/publicTestUtils';

const CONTENT = {
  'cookie.title': 'Cookie-Hinweis',
  'cookie.description': 'Nur technisch notwendige Speicherung.',
  'cookie.accept': 'Verstanden',
  'cookie.link': 'Datenschutzerklärung',
};

function renderLayout() {
  return renderPublicRoutes(
    [
      <Route key="layout" element={<DefaultLayout />}>
        <Route index element={<p>Slot-Inhalt</p>} />
      </Route>,
    ],
    { route: '/' },
  );
}

describe('DefaultLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPublicContent(CONTENT);
  });

  it('renders header, outlet content and footer', async () => {
    renderLayout();

    expect(await screen.findByText('Slot-Inhalt')).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Rechtliches' })).toBeVisible();
  });

  it('shows the cookie notice and hides it after confirmation', async () => {
    renderLayout();

    expect(await screen.findByText('Nur technisch notwendige Speicherung.')).toBeVisible();
    const notice = screen.getByRole('region', { name: 'Cookie-Hinweis' });
    expect(within(notice).getByText('Nur technisch notwendige Speicherung.')).toBeVisible();

    await userEvent.click(within(notice).getByRole('button', { name: 'Verstanden' }));

    expect(screen.queryByRole('region', { name: 'Cookie-Hinweis' })).not.toBeInTheDocument();
  });
});
