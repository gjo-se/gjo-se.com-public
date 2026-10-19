/**
 * Tests: useCloseOnEscape
 *
 * Verifies that Escape closes an open overlay, that a closed overlay registers
 * no listener, and that the listener is detached on unmount.
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCloseOnEscape } from '@src/features/viscera/viewer/hooks/useCloseOnEscape';

describe('useCloseOnEscape', () => {
  it('closes the overlay when escape is pressed while open', () => {
    let closes = 0;
    renderHook(() => useCloseOnEscape(true, () => { closes += 1; }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(closes).toBe(1);
  });

  it('ignores other keys while open', () => {
    let closes = 0;
    renderHook(() => useCloseOnEscape(true, () => { closes += 1; }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    expect(closes).toBe(0);
  });

  it('does not listen while closed', () => {
    let closes = 0;
    renderHook(() => useCloseOnEscape(false, () => { closes += 1; }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(closes).toBe(0);
  });

  it('detaches the listener on unmount', () => {
    let closes = 0;
    const { unmount } = renderHook(() => useCloseOnEscape(true, () => { closes += 1; }));

    unmount();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(closes).toBe(0);
  });
});
