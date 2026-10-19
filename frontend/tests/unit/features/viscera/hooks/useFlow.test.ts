/**
 * Tests: useFlow
 *
 * Verifies playback state at the public interface: empty flows are inert,
 * next/prev stop at the boundaries, goToStep clamps, play wraps from the last
 * step, and auto-play advances every 2s and stops at the end.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFlow } from '@src/features/viscera/hooks/useFlow';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../helpers';

import type { Flow } from '@src/features/viscera/core/workspaceSchema';

const FLOW: Flow = {
  id: 'request-flow',
  title: 'Request Flow',
  description: 'A request travels through the stack',
  tags: [],
  flowParentIds: ['parent-flow'],
  steps: [
    { id: 'step-1', type: 'message', from: 'api', to: 'db' },
    { id: 'step-2', type: 'process', from: 'db', to: 'cache' },
    { id: 'step-3', type: 'message', from: 'cache', to: 'client' },
  ],
};

beforeEach(() => {
  resetVisceraStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useFlow', () => {
  it('is inert without an active flow', () => {
    const { result } = renderHook(() => useFlow(null));

    expect(result.current.stepCount).toBe(0);
    expect(result.current.activeStep).toBeNull();
    expect(result.current.parentFlowIds).toEqual([]);

    act(() => result.current.play());
    expect(useVisceraStore.getState().isPlaying).toBe(false);
  });

  it('advances and stops at the last step', () => {
    const { result } = renderHook(() => useFlow(FLOW));
    expect(result.current.activeStep?.id).toBe('step-1');

    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());

    expect(result.current.activeStepIndex).toBe(2);
    expect(result.current.activeStep?.id).toBe('step-3');
    expect(useVisceraStore.getState().isPlaying).toBe(false);
  });

  it('goes back and stops at step zero', () => {
    useVisceraStore.getState().setStep(2);
    const { result } = renderHook(() => useFlow(FLOW));

    act(() => result.current.prev());
    act(() => result.current.prev());
    act(() => result.current.prev());

    expect(result.current.activeStepIndex).toBe(0);
  });

  it('clamps direct step jumps to the available range', () => {
    const { result } = renderHook(() => useFlow(FLOW));

    act(() => result.current.goToStep(99));
    expect(result.current.activeStepIndex).toBe(2);

    act(() => result.current.goToStep(-5));
    expect(result.current.activeStepIndex).toBe(0);
  });

  it('wraps to the first step when playing from the last step', () => {
    useVisceraStore.getState().setStep(2);
    const { result } = renderHook(() => useFlow(FLOW));

    act(() => result.current.play());

    expect(result.current.activeStepIndex).toBe(0);
    expect(result.current.isPlaying).toBe(true);
  });

  it('advances auto-play every two seconds and stops after the last step', () => {
    vi.useFakeTimers();
    useVisceraStore.getState().setPlaying(true);
    const { result } = renderHook(() => useFlow(FLOW));

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.activeStepIndex).toBe(1);

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.activeStepIndex).toBe(2);

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.activeStepIndex).toBe(2);
  });

  it('pauses without resetting the step index', () => {
    useVisceraStore.getState().setStep(1);
    useVisceraStore.getState().setPlaying(true);
    const { result } = renderHook(() => useFlow(FLOW));

    act(() => result.current.pause());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.activeStepIndex).toBe(1);
  });

  it('exposes the parent flow ids of the active flow', () => {
    const { result } = renderHook(() => useFlow(FLOW));

    expect(result.current.parentFlowIds).toEqual(['parent-flow']);
  });
});
