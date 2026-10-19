/**
 * Tests: useInlineEdit – click-to-edit state with trim/compare commit and
 * revert-to-value cancel semantics.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useInlineEdit } from '@src/hooks/useInlineEdit';

describe('useInlineEdit', () => {
  it('starts with the current value and not editing', () => {
    const { result } = renderHook(() => useInlineEdit('Initial', vi.fn()));

    expect(result.current.editing).toBe(false);
    expect(result.current.draft).toBe('Initial');
  });

  it('enters edit mode with a fresh draft from the current value', () => {
    const { result, rerender } = renderHook(({ value }) => useInlineEdit(value, vi.fn()), {
      initialProps: { value: 'Old' },
    });

    rerender({ value: 'New' });
    act(() => {
      result.current.start();
    });

    expect(result.current.editing).toBe(true);
    expect(result.current.draft).toBe('New');
  });

  it('saves the trimmed draft when it differs', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useInlineEdit('Old', onSave));

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.setDraft('  New value  ');
    });
    act(() => {
      result.current.commit();
    });

    expect(onSave).toHaveBeenCalledWith('New value');
    expect(result.current.editing).toBe(false);
  });

  it('does not save when the trimmed draft equals the value', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useInlineEdit('Same', onSave));

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.setDraft('  Same  ');
    });
    act(() => {
      result.current.commit();
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.editing).toBe(false);
  });

  it('saves an empty draft when the current value is not empty', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useInlineEdit('Old', onSave));

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.setDraft('   ');
    });
    act(() => {
      result.current.commit();
    });

    expect(onSave).toHaveBeenCalledWith('');
  });

  it('restores the draft and leaves edit mode on cancel', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useInlineEdit('Old', onSave));

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.setDraft('Changed');
    });
    act(() => {
      result.current.cancel();
    });

    expect(result.current.editing).toBe(false);
    expect(result.current.draft).toBe('Old');
    expect(onSave).not.toHaveBeenCalled();
  });
});
