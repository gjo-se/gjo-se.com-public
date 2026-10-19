import { render, screen } from '@testing-library/react';
import { delay, http } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import VerifyEmailChangeForm from '@src/components/forms/VerifyEmailChangeForm/VerifyEmailChangeForm';
import { worker } from '@src/mocks/browser';

describe('VerifyEmailChangeForm', () => {
  it('shows the loading state while the token is being verified', () => {
    worker.use(
      http.get('/api/v1/public/auth/verify-email-change', async () => {
        await delay('infinite');
        return new Response(null);
      }),
    );

    render(
      <MemoryRouter initialEntries={['/verify-email-change?token=valid-token']}>
        <VerifyEmailChangeForm />
      </MemoryRouter>,
    );

    expect(screen.getByText('Neue E-Mail-Adresse wird bestätigt ...')).toBeVisible();
  });
});
