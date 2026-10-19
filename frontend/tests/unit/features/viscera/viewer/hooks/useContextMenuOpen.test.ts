/**
 * Tests: useContextMenuOpen
 *
 * Verifies the shared context-menu handler: the browser menu is suppressed and
 * the referenced imperative menu is opened at the pointer position.
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useContextMenuOpen } from '@src/features/viscera/viewer/hooks/useContextMenuOpen';

describe('useContextMenuOpen', () => {
  it('opens the menu at the pointer position', () => {
    const opened: { x: number; y: number }[] = [];
    const ref = { current: { open: (x: number, y: number) => opened.push({ x, y }) } };
    const { result } = renderHook(() => useContextMenuOpen(ref));

    result.current({ clientX: 120, clientY: 45, preventDefault: () => undefined, stopPropagation: () => undefined } as React.MouseEvent);

    expect(opened).toEqual([{ x: 120, y: 45 }]);
  });

  it('suppresses the native context menu', () => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    const ref = { current: { open: () => undefined } };
    const { result } = renderHook(() => useContextMenuOpen(ref));

    result.current(event as unknown as React.MouseEvent);

    expect(event.defaultPrevented).toBe(true);
  });

  it('does nothing when the menu ref is not mounted', () => {
    const ref: { current: { open: (x: number, y: number) => void } | null } = { current: null };
    const { result } = renderHook(() => useContextMenuOpen(ref));
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });

    result.current(event as unknown as React.MouseEvent);

    expect(event.defaultPrevented).toBe(true);
  });
});
