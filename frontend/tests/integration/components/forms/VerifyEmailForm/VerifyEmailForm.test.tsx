import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import VerifyEmailForm from '@src/components/forms/VerifyEmailForm/VerifyEmailForm';

function renderForm(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <VerifyEmailForm />
    </MemoryRouter>,
  );
}

describe('VerifyEmailForm', () => {
  it('shows the error state without a token and offers the resend form', () => {
    renderForm('/verify-email');

    expect(screen.getByRole('heading', { name: 'Ungültiger Link' })).toBeVisible();
    expect(screen.getByPlaceholderText('Deine E-Mail-Adresse')).toBeVisible();
  });

  it('confirms the address over MSW', async () => {
    renderForm('/verify-email?token=valid-token');

    expect(await screen.findByRole('heading', { name: 'E-Mail bestätigt ✓' })).toBeVisible();
  });

  it('shows the expired state for an expired token', async () => {
    const { worker } = await import('@src/mocks/browser');
    const { http, HttpResponse } = await import('msw');
    worker.use(
      http.get('/api/v1/public/auth/verify-email', () =>
        HttpResponse.json({ detail: 'Token expired' }, { status: 400 }),
      ),
    );

    renderForm('/verify-email?token=expired-token');

    expect(await screen.findByRole('heading', { name: 'Link abgelaufen' })).toBeVisible();
  });

  it('sends a new verification mail and shows the response', async () => {
    renderForm('/verify-email');

    await userEvent.fill(screen.getByPlaceholderText('Deine E-Mail-Adresse'), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Neue Bestätigungs-E-Mail anfordern' }));

    expect(await screen.findByText('ok')).toBeVisible();
  });
});
