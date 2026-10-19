import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ErrorBoundary from '@src/components/organisms/ErrorBoundary/ErrorBoundary';

function ThrowingChild({ message = 'Kaputt' }: { message?: string }): never {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  it('renders the default fallback with the error message', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="Render fehlgeschlagen" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Etwas ist schiefgelaufen')).toBeVisible();
    expect(screen.getByText('Render fehlgeschlagen')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Neu laden' })).toBeVisible();
  });

  it('renders the supplied fallback instead of the default', () => {
    render(
      <ErrorBoundary fallback={<p>Eigener Fehlerhinweis</p>}>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Eigener Fehlerhinweis')).toBeVisible();
    expect(screen.queryByText('Etwas ist schiefgelaufen')).not.toBeInTheDocument();
  });

  it('renders children while no error occurs', () => {
    render(
      <ErrorBoundary>
        <p>Alles in Ordnung</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Alles in Ordnung')).toBeVisible();
  });
});
