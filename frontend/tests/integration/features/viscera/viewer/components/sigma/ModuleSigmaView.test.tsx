import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ModuleSigmaView from '@src/features/viscera/viewer/components/sigma/ModuleSigmaView';

describe('ModuleSigmaView', () => {
  it('shows the loading state', () => {
    render(<ModuleSigmaView modules={[]} loading error={null} />);

    expect(screen.getByText('Loading modules…')).toBeInTheDocument();
  });

  it('shows an error with a reload action', () => {
    const onReload = vi.fn();
    render(<ModuleSigmaView modules={[]} loading={false} error="Netzwerkfehler" onReload={onReload} />);

    expect(screen.getByText('Fehler beim Laden der Module:')).toBeInTheDocument();
    expect(screen.getByText('Netzwerkfehler')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Erneut laden' }));

    expect(onReload).toHaveBeenCalledOnce();
  });

  it('shows an empty hint without modules', () => {
    render(<ModuleSigmaView modules={[]} loading={false} error={null} />);

    expect(screen.getByText('Keine Module für die aktive Sicht')).toBeInTheDocument();
  });
});
