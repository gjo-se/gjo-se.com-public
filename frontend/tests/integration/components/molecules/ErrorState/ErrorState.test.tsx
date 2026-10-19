import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ErrorState from '@src/components/molecules/ErrorState/ErrorState';

describe('ErrorState', () => {
  it('renders code, title and description', () => {
    render(
      <ErrorState code="404" title="Seite nicht gefunden" description="Die Seite existiert nicht." />,
    );

    expect(screen.getByText('404')).toBeVisible();
    expect(screen.getByText('Seite nicht gefunden')).toBeVisible();
    expect(screen.getByText('Die Seite existiert nicht.')).toBeVisible();
  });

  it('omits the code when none is given', () => {
    render(<ErrorState title="Fehler" description="Etwas ist schiefgelaufen." />);

    expect(screen.queryByText('404')).not.toBeInTheDocument();
    expect(screen.getByText('Fehler')).toBeVisible();
  });

  it('renders no action button without a label', () => {
    render(<ErrorState title="Fehler" description="Beschreibung" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('invokes the action callback', async () => {
    const onButtonClick = vi.fn();
    render(
      <ErrorState
        title="Fehler"
        description="Beschreibung"
        buttonLabel="Zur Startseite"
        onButtonClick={onButtonClick}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Zur Startseite' }));

    expect(onButtonClick).toHaveBeenCalledOnce();
  });
});
