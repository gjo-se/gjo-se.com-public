import { render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { AuthProvider } from '@src/contexts/AuthContext';
import { useAuth } from '@src/hooks/useAuth';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

/** Small consumer that exposes the auth context at its public interface. */
function AuthProbe() {
  const { user, isLoading, logout } = useAuth();

  return (
    <div>
      <p>{isLoading ? 'lädt' : 'bereit'}</p>
      <p>Nutzer: {user?.name ?? 'anonym'}</p>
      <button onClick={() => void logout()}>Abmelden</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  );
}

describe('AuthContext', () => {
  it('restores the session from the current user endpoint', async () => {
    renderProbe();

    expect(await screen.findByText('Nutzer: Admin Fixture')).toBeVisible();
    expect(screen.getByText('bereit')).toBeVisible();
  });

  it('refreshes an expired session and then restores the user', async () => {
    let meCalls = 0;
    worker.use(
      http.get(`${base}/user/auth/me`, () => {
        meCalls += 1;
        return meCalls === 1
          ? HttpResponse.json({ detail: 'expired' }, { status: 401 })
          : HttpResponse.json({
            id: 1,
            email: 'admin@example.com',
            name: 'Admin Fixture',
            role: 'admin',
            is_active: true,
          });
      }),
    );

    renderProbe();

    expect(await screen.findByText('Nutzer: Admin Fixture')).toBeVisible();
    expect(meCalls).toBe(2);
  });

  it('clears the user on logout', async () => {
    renderProbe();

    expect(await screen.findByText('Nutzer: Admin Fixture')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Abmelden' }));

    expect(await screen.findByText('Nutzer: anonym')).toBeVisible();
  });
});
