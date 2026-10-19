import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import AuthForm from '@src/components/forms/AuthForm/AuthForm';
import { AuthProvider } from '@src/contexts/AuthContext';

import { FORM_VALUE, FORM_VALUE_MISMATCH } from '../../../fixtures/formValues';

function renderForm(mode: 'login' | 'register', onSuccess = vi.fn()) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AuthForm mode={mode} onSuccess={onSuccess} />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AuthForm', () => {
  it('renders the login fields', () => {
    renderForm('login');

    expect(screen.getByLabelText('E-Mail')).toBeVisible();
    expect(screen.getByLabelText('Passwort')).toBeVisible();
    expect(screen.getByRole('button', { name: /Anmelden/ })).toBeVisible();
  });

  it('logs in over MSW and reports the authenticated user', async () => {
    const onSuccess = vi.fn();
    const { worker } = await import('@src/mocks/browser');
    const { http, HttpResponse } = await import('msw');
    worker.use(
      http.post('/api/v1/dev/login-as', () => new HttpResponse(null, { status: 422 })),
    );

    renderForm('login', onSuccess);

    await userEvent.fill(screen.getByLabelText('E-Mail'), 'admin@example.com');
    await userEvent.fill(screen.getByLabelText('Passwort'), FORM_VALUE);
    await userEvent.click(screen.getByRole('button', { name: /Anmelden/ }));

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });

  it('shows a generic error for invalid credentials', async () => {
    const { worker } = await import('@src/mocks/browser');
    const { http, HttpResponse } = await import('msw');
    worker.use(
      http.post('/api/v1/public/auth/login', () =>
        HttpResponse.json({ detail: 'invalid' }, { status: 401 }),
      ),
    );

    renderForm('login');

    await userEvent.fill(screen.getByLabelText('E-Mail'), 'admin@example.com');
    await userEvent.fill(screen.getByLabelText('Passwort'), 'falsch');
    await userEvent.click(screen.getByRole('button', { name: /Anmelden/ }));

    expect(await screen.findByText('E-Mail oder Passwort falsch.')).toBeVisible();
  });

  it('rejects mismatching registration passwords before the request', async () => {
    renderForm('register');

    await userEvent.fill(screen.getByLabelText('Name'), 'Max');
    await userEvent.fill(screen.getByLabelText('E-Mail'), 'max@example.com');
    await userEvent.fill(screen.getByLabelText('Passwort'), FORM_VALUE);
    await userEvent.fill(screen.getByLabelText('Passwort wiederholen'), FORM_VALUE_MISMATCH);
    await userEvent.click(screen.getByRole('button', { name: 'Registrieren' }));

    expect(await screen.findByText('Die Passwörter stimmen nicht überein.')).toBeVisible();
  });
});
