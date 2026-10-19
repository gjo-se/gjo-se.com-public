import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ProfilePhotoRow from '@src/features/application-profile/components/profile-photo-row/ProfilePhotoRow';

describe('ProfilePhotoRow', () => {
  it('renders the placeholder when no photo is set', () => {
    render(
      <ProfilePhotoRow
        photoUrl={null}
        version="v1"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Porträtfoto')).toBeInTheDocument();
    expect(screen.getByTitle('Kein Foto')).toBeInTheDocument();
    expect(screen.queryByAltText('Porträtfoto')).not.toBeInTheDocument();
  });

  it('renders the preview with cache-busting version when a photo is set', () => {
    render(
      <ProfilePhotoRow
        photoUrl="profile/foto.webp"
        version="v1"
        onSelect={vi.fn()}
      />,
    );

    const image = screen.getByAltText('Porträtfoto');
    expect(image).toHaveAttribute(
      'src',
      expect.stringContaining('/api/v1/stream/profile/foto.webp'),
    );
    expect(image).toHaveAttribute('src', expect.stringContaining('?v=v1'));
  });

  it('opens the asset picker for a new photo', async () => {
    render(<ProfilePhotoRow photoUrl={null} version="v1" onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('Asset auswählen')).toBeInTheDocument();
  });
});
