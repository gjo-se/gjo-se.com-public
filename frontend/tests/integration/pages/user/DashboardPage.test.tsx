import { screen, within } from '@testing-library/react';
import { Route } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import DashboardPage from '@src/pages/user/DashboardPage';

import { renderPublicRoutes } from '../publicTestUtils';

function renderDashboard() {
  return renderPublicRoutes(
    [
      <Route key="dashboard" path="/user" element={<DashboardPage />} />,
      <Route key="home" path="/" element={<p>Startseite</p>} />,
    ],
    { route: '/user' },
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the current user profile data', async () => {
    renderDashboard();

    expect(
      await screen.findByRole('heading', { name: 'Willkommen, Admin Fixture' }),
    ).toBeVisible();
    expect(screen.getByText('admin@example.com · admin')).toBeVisible();
    expect(screen.getByText('Profil')).toBeVisible();
  });

  it('switches to the API-keys tab and loads the provider keys', async () => {
    renderDashboard();

    const tabs = await screen.findByRole('tablist');
    await userEvent.click(within(tabs).getByRole('tab', { name: 'API-Keys' }));

    expect(await screen.findByText('Meine LLM API-Keys')).toBeVisible();
    expect(await screen.findByText('Fixture Key')).toBeVisible();
  });

  it('logs out and returns to the start page', async () => {
    renderDashboard();

    await userEvent.click(await screen.findByRole('button', { name: 'Abmelden' }));

    expect(await screen.findByText('Startseite')).toBeVisible();
  });
});
