/**
 * Tests: useRestoreLastUrl
 *
 * Verifies the URL-as-SSOT bookmarking: meaningful URLs are persisted per view,
 * bare view URLs are not persisted, saved state is restored on clean/bare
 * navigation, and fully specified shared links are left untouched.
 */

import { act, render } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { useRestoreLastUrl } from '@src/features/viscera/hooks/useRestoreLastUrl';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../helpers';

let currentLocation = '';
let navigateTo: ((target: string) => void) | null = null;

function LocationProbe(): null {
  useRestoreLastUrl();
  const location = useLocation();
  const navigate = useNavigate();
  navigateTo = (target: string) => navigate(target);
  currentLocation = location.pathname + location.search;
  return null;
}

function renderAt(entry: string): void {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  resetVisceraStore();
  currentLocation = '';
  navigateTo = null;
});

describe('useRestoreLastUrl', () => {
  it('persists a URL that carries viewport state', () => {
    renderAt('/admin/viscera/views?view=Backend&zoom=1.5&x=10&y=20');

    expect(useVisceraStore.getState().lastUrl).toEqual({
      Backend: '/admin/viscera/views?view=Backend&zoom=1.5&x=10&y=20',
    });
  });

  it('does not persist a bare view URL', () => {
    renderAt('/admin/viscera/views?view=Backend');

    expect(useVisceraStore.getState().lastUrl).toEqual({});
  });

  it('restores the saved SystemContext state on a clean URL', () => {
    useVisceraStore.getState().setLastUrl(
      'SystemContext',
      '/admin/viscera/views?zoom=2&x=10&y=20',
    );

    renderAt('/admin/viscera/views');

    expect(currentLocation).toBe('/admin/viscera/views?zoom=2&x=10&y=20');
  });

  it('restores a saved view when navigating to its bare view URL', () => {
    useVisceraStore.getState().setLastUrl('Backend', '/admin/viscera/views?view=Backend&zoom=3');
    renderAt('/admin/viscera/views?view=Other&zoom=1');

    act(() => navigateTo?.('/admin/viscera/views?view=Backend'));

    expect(currentLocation).toBe('/admin/viscera/views?view=Backend&zoom=3');
  });

  it('leaves a fully specified shared link untouched', () => {
    useVisceraStore.getState().setLastUrl('Backend', '/admin/viscera/views?view=Backend&zoom=3');

    renderAt('/admin/viscera/views?view=Backend&zoom=2&x=1&y=2');

    expect(currentLocation).toBe('/admin/viscera/views?view=Backend&zoom=2&x=1&y=2');
  });
});
