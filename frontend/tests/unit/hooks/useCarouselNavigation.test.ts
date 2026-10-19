/**
 * Tests: useCarouselNavigation – wrap-around index and gated keyboard handling.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCarouselNavigation } from '@src/hooks/useCarouselNavigation';

function setup(count = 3, isOpen = true) {
  const onClose = vi.fn();
  const view = renderHook(() => useCarouselNavigation({ count, isOpen, onClose }));
  return { ...view, onClose };
}

describe('useCarouselNavigation', () => {
  it('starts at the initial index', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useCarouselNavigation({ count: 3, isOpen: true, onClose, initialIndex: 2 }),
    );

    expect(result.current.activeIndex).toBe(2);
  });

  it('wraps forward from the last to the first item', () => {
    const { result } = setup(3);
    act(() => {
      result.current.setActiveIndex(2);
    });

    act(() => {
      result.current.goNext();
    });

    expect(result.current.activeIndex).toBe(0);
  });

  it('wraps backward from the first to the last item', () => {
    const { result } = setup(3);

    act(() => {
      result.current.goPrev();
    });

    expect(result.current.activeIndex).toBe(2);
  });

  it('steps with the arrow keys while open', () => {
    const { result } = setup(3);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(result.current.activeIndex).toBe(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    expect(result.current.activeIndex).toBe(0);
  });

  it('closes on Escape while open', () => {
    const { onClose } = setup(3);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores keys while closed', () => {
    const { result, onClose } = setup(3, false);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(result.current.activeIndex).toBe(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('detaches the key listener on unmount', () => {
    const { onClose, unmount } = setup(3);

    unmount();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});
