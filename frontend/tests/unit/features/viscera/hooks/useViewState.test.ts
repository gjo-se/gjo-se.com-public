/**
 * Tests: useViewState
 *
 * Verifies the store-backed view state facade: defaults, setter delegation, and
 * the view switch resetting detail/object state.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useViewState } from '@src/features/viscera/hooks/useViewState';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../helpers';

beforeEach(() => {
  resetVisceraStore();
});

describe('useViewState', () => {
  it('exposes the default view state', () => {
    const { result } = renderHook(() => useViewState());

    expect(result.current.currentViewKey).toBe('SystemContext');
    expect(result.current.detailContainerId).toBeNull();
    expect(result.current.objectId).toBeNull();
    expect(result.current.objectTab).toBe('details');
  });

  it('writes a custom view key to the store', () => {
    const { result } = renderHook(() => useViewState());

    act(() => result.current.setViewKey('backend-container'));

    expect(result.current.currentViewKey).toBe('backend-container');
    expect(useVisceraStore.getState().viewKey).toBe('backend-container');
  });

  it('opens and closes the object detail state', () => {
    const { result } = renderHook(() => useViewState());

    act(() => result.current.setObjectId('backend.api'));
    act(() => result.current.setObjectTab('edges'));

    expect(result.current.objectId).toBe('backend.api');
    expect(result.current.objectTab).toBe('edges');

    act(() => result.current.setObjectId(null));
    expect(result.current.objectId).toBeNull();
  });

  it('sets and clears the detail container', () => {
    const { result } = renderHook(() => useViewState());

    act(() => result.current.setDetailContainer('backend.api'));
    expect(result.current.detailContainerId).toBe('backend.api');

    act(() => result.current.setDetailContainer(null));
    expect(result.current.detailContainerId).toBeNull();
  });

  it('resets object and detail state on a view switch', () => {
    const { result } = renderHook(() => useViewState());
    act(() => result.current.setObjectId('backend.api'));
    act(() => result.current.setDetailContainer('backend.api'));

    act(() => result.current.setViewKey('other-view'));

    expect(result.current.objectId).toBeNull();
    expect(result.current.detailContainerId).toBeNull();
    expect(result.current.objectTab).toBe('details');
  });
});
