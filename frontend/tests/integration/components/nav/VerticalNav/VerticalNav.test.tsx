import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import VerticalNav from '@src/components/nav/VerticalNav/VerticalNav';
import SidebarProvider from '@src/components/primitives/Sidebar/SidebarProvider';
import { AuthProvider } from '@src/contexts/AuthContext';

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
});

function renderNav() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SidebarProvider>
          <VerticalNav />
        </SidebarProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('VerticalNav', () => {
  it('renders the brand and the admin groups', async () => {
    renderNav();

    expect(await screen.findByText('gjo-se.com')).toBeVisible();
    expect(screen.getByRole('button', { name: /Übersicht/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /FBF/ })).toBeVisible();
  });

  it('renders the website link and the logout action', async () => {
    renderNav();

    expect(await screen.findByRole('link', { name: /Zur Website/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Abmelden/ })).toBeVisible();
  });

  it('toggles the theme through the sidebar action', async () => {
    localStorage.setItem('theme', 'dark');
    renderNav();

    const toggle = await screen.findByRole('button', { name: /Light Mode/ });
    await userEvent.click(toggle);

    expect(await screen.findByRole('button', { name: /Dark Mode/ })).toBeVisible();
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('collapses and expands an admin group', async () => {
    renderNav();

    const group = await screen.findByRole('button', { name: /FBF/ });
    await userEvent.click(group);

    expect(screen.getByRole('button', { name: /FBF/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
