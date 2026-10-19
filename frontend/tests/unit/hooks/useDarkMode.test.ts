/**
 * Tests: useDarkMode – dark-mode state persisted to localStorage and applied to
 * the document element.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useDarkMode } from '@src/hooks/useDarkMode';

describe('useDarkMode', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to dark when no preference is stored', () => {
    const { result } = renderHook(() => useDarkMode());

    expect(result.current[0]).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('honours a stored light preference', () => {
    localStorage.setItem('theme', 'light');

    const { result } = renderHook(() => useDarkMode());

    expect(result.current[0]).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggles the theme and persists it', () => {
    localStorage.setItem('theme', 'light');
    const { result } = renderHook(() => useDarkMode());

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
