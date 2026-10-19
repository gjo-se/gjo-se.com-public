import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import ForgotPasswordForm from '@src/components/forms/ForgotPasswordForm/ForgotPasswordForm';

describe('ForgotPasswordForm', () => {
  it('renders the email field and the submit action', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordForm />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Passwort vergessen' })).toBeVisible();
    expect(screen.getByPlaceholderText('name@example.com')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reset-Link anfordern' })).toBeVisible();
  });

  it('shows neutral success feedback after submitting over MSW', async () => {
    render(
      <MemoryRouter>
        <ForgotPasswordForm />
      </MemoryRouter>,
    );

    await userEvent.fill(screen.getByPlaceholderText('name@example.com'), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Reset-Link anfordern' }));

    expect(await screen.findByRole('heading', { name: 'E-Mail unterwegs ✓' })).toBeVisible();
  });

  it('keeps the form and shows an error when the request fails', async () => {
    const { worker } = await import('@src/mocks/browser');
    const { http, HttpResponse } = await import('msw');
    worker.use(
      http.post('/api/v1/public/auth/forgot-password', () => new HttpResponse(null, { status: 500 })),
    );

    render(
      <MemoryRouter>
        <ForgotPasswordForm />
      </MemoryRouter>,
    );

    await userEvent.fill(screen.getByPlaceholderText('name@example.com'), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Reset-Link anfordern' }));

    expect(
      await screen.findByText('Ein Fehler ist aufgetreten. Bitte versuche es später erneut.'),
    ).toBeVisible();
  });
});
