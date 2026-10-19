import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import EnvBar from '@src/components/organisms/EnvBar/EnvBar';

describe('EnvBar', () => {
  it('renders the dev environment bar on a local host', () => {
    render(<EnvBar />);

    expect(screen.getByRole('status', { name: 'Umgebung: DEV' })).toBeVisible();
    expect(screen.getByText('DEV')).toBeVisible();
  });

  it('marks the document as having an environment bar', () => {
    render(<EnvBar />);

    expect(document.documentElement).toHaveClass('has-env-bar');
  });

  it('removes the marker when the bar unmounts', () => {
    const { unmount } = render(<EnvBar />);

    unmount();

    expect(document.documentElement).not.toHaveClass('has-env-bar');
  });
});
