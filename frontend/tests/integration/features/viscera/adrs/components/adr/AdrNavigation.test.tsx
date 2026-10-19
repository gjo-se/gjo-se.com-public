import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AdrNavigation from '@src/features/viscera/adrs/components/adr/AdrNavigation';

import { renderWithWorkspace } from '../../../visceraTestUtils';

describe('AdrNavigation', () => {
  it('renders the zero-padded position counter', () => {
    renderWithWorkspace(
      <AdrNavigation
        currentId="0001"
        total={25}
        hasPrev={false}
        hasNext
        onPrev={vi.fn()}
        onNext={vi.fn()}
        backTo="/admin/viscera/adrs"
      />,
    );

    expect(screen.getByText('0001 / 0025')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Zurück zur Liste/ })).toHaveAttribute(
      'href',
      '/admin/viscera/adrs',
    );
  });

  it('calls the navigation callbacks on click', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();

    renderWithWorkspace(
      <AdrNavigation
        currentId="0002"
        total={3}
        hasPrev
        hasNext
        onPrev={onPrev}
        onNext={onNext}
        backTo="/admin/viscera/adrs"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Vorherige ADR' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nächste ADR' }));

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('disables the prev button on the first ADR', () => {
    renderWithWorkspace(
      <AdrNavigation
        currentId="0001"
        total={2}
        hasPrev={false}
        hasNext
        onPrev={vi.fn()}
        onNext={vi.fn()}
        backTo="/admin/viscera/adrs"
      />,
    );

    expect(screen.getByRole('button', { name: 'Vorherige ADR' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nächste ADR' })).toBeEnabled();
  });
});
