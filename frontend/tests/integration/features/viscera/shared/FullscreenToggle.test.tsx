import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FullscreenToggle from '@src/features/viscera/shared/FullscreenToggle';

import { renderWithWorkspace } from '../visceraTestUtils';

describe('FullscreenToggle', () => {
  it('offers opening the fullscreen view', () => {
    renderWithWorkspace(<FullscreenToggle isFullscreen={false} onToggle={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Vollbild öffnen (Taste F)' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('offers leaving the fullscreen view when active', () => {
    renderWithWorkspace(<FullscreenToggle isFullscreen onToggle={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Vollbild beenden (Taste F)' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('reports the toggle click', () => {
    const onToggle = vi.fn();
    renderWithWorkspace(<FullscreenToggle isFullscreen={false} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button', { name: 'Vollbild öffnen (Taste F)' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
