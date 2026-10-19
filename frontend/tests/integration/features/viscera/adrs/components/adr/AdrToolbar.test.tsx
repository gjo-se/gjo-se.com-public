import { fireEvent, screen } from '@testing-library/react';
import { useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import AdrToolbar from '@src/features/viscera/adrs/components/adr/AdrToolbar';

import { renderWithWorkspace } from '../../../visceraTestUtils';

/** Renders the current search string so the URL persistence is observable. */
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

describe('AdrToolbar', () => {
  it('renders the status placeholder when no filter is set', () => {
    renderWithWorkspace(
      <>
        <AdrToolbar />
        <LocationProbe />
      </>,
      { route: '/admin/viscera/adrs' },
    );

    expect(screen.getByRole('button', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('');
  });

  it('persists the selected status in the url', () => {
    renderWithWorkspace(
      <>
        <AdrToolbar />
        <LocationProbe />
      </>,
      { route: '/admin/viscera/adrs' },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Status' }));
    fireEvent.click(screen.getByRole('option', { name: 'Accepted' }));

    expect(screen.getByTestId('location')).toHaveTextContent('?status=accepted');
  });

  it('removes the status parameter when "All" is selected', () => {
    renderWithWorkspace(
      <>
        <AdrToolbar />
        <LocationProbe />
      </>,
      { route: '/admin/viscera/adrs?status=accepted' },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accepted' }));
    fireEvent.click(screen.getByRole('option', { name: 'All' }));

    expect(screen.getByTestId('location')).toHaveTextContent('');
  });
});
