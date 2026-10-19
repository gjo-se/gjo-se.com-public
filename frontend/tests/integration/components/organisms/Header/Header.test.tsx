import { render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import Header from '@src/components/organisms/Header/Header';
import { AuthProvider } from '@src/contexts/AuthContext';
import { worker } from '@src/mocks/browser';

function renderHeader(path = '/') {
  worker.use(http.get('/api/v1/public/content/de', () => HttpResponse.json({})));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Header />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Header', () => {
  it('renders the brand link and the main navigation', async () => {
    renderHeader();

    expect(screen.getByRole('link', { name: 'gjo:Se – Startseite' })).toBeVisible();
    expect(await screen.findByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  });

  it('opens the utility menu with language and account entries', async () => {
    renderHeader();

    await userEvent.click(await screen.findByRole('button', { name: 'Einstellungen' }));

    expect(screen.getByText('Sprache')).toBeVisible();
    expect(screen.getByRole('menuitemradio', { name: /Deutsch/ })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: /Abmelden/ })).toBeVisible();
  });

  it('marks the current language in the utility menu', async () => {
    renderHeader('/en');

    await userEvent.click(await screen.findByRole('button', { name: 'Einstellungen' }));

    expect(screen.getByRole('menuitemradio', { name: /English/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('menuitemradio', { name: /Deutsch/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('opens and closes the mobile drawer', async () => {
    renderHeader();

    await userEvent.click(await screen.findByRole('button', { name: 'Menü öffnen' }));
    expect(await screen.findByRole('dialog', { name: 'Menü' })).toBeVisible();

    const closeButtons = screen.getAllByRole('button', { name: 'Menü schließen' });
    closeButtons[closeButtons.length - 1]!.click();

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Menü' })).not.toBeInTheDocument(),
    );
  });

  it('switches the language through the utility menu', async () => {
    renderHeader();

    await userEvent.click(await screen.findByRole('button', { name: 'Einstellungen' }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: /English/ }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the utility menu with Escape', async () => {
    renderHeader();

    await userEvent.click(await screen.findByRole('button', { name: 'Einstellungen' }));
    expect(await screen.findByRole('menu')).toBeVisible();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
