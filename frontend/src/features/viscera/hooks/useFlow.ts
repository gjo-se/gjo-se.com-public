import { useCallback, useEffect, useRef } from 'react';

import { useVisceraStore } from '../store/visceraStore';

import type { Flow, FlowStep } from '../core/workspaceSchema';

/** Interval in milliseconds between auto-play steps. */
const STEP_INTERVAL_MS = 2000;

export interface UseFlowResult {
  /** Zero-based index of the currently active step. */
  activeStepIndex: number;
  /** The currently active FlowStep object, or null if no flow is active. */
  activeStep: FlowStep | null;
  /** Total number of steps in the active flow. */
  stepCount: number;
  /** Whether auto-play is currently running. */
  isPlaying: boolean;
  /** Start or restart auto-play (wraps to step 0 if at the last step). */
  play: () => void;
  /** Pause auto-play without resetting the step index. */
  pause: () => void;
  /** Advance to the next step. Stops at the boundary (does not wrap). */
  next: () => void;
  /** Go back to the previous step. Stops at index 0 (does not wrap). */
  prev: () => void;
  /** Jump to a specific step index (clamped to [0, stepCount-1]). */
  goToStep: (index: number) => void;
  /** Parent flow IDs from the active flow's `flowParentIds` field. */
  parentFlowIds: string[];
}

/**
 * Hook that manages flow playback state: active step index,
 * play/pause auto-advance, and manual next/prev navigation.
 *
 * Flow playback state is stored in the Zustand VisceraStore
 * (FlowSlice). Auto-play logic (setInterval) remains in the hook
 * as a side effect.
 *
 * Play mode advances automatically every 2s and stops after
 * the last step. Prev/Next do not wrap.
 */
export function useFlow(flow: Flow | null): UseFlowResult {
  const stepCount = flow?.steps.length ?? 0;
  const activeStepIndex = useVisceraStore((s) => s.activeStepIndex);
  const isPlaying = useVisceraStore((s) => s.isPlaying);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-play interval
  useEffect(() => {
    if (isPlaying && stepCount > 0) {
      intervalRef.current = setInterval(() => {
        const store = useVisceraStore.getState();
        const next = store.activeStepIndex + 1;
        if (next >= stepCount) {
          store.setPlaying(false);
        } else {
          store.setActiveStepIndex(next);
        }
      }, STEP_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, stepCount]);

  const play = useCallback(() => {
    if (stepCount === 0) return;
    const store = useVisceraStore.getState();
    // If at last step, wrap to beginning before playing
    if (store.activeStepIndex >= stepCount - 1) {
      store.setActiveStepIndex(0);
    }
    store.setPlaying(true);
  }, [stepCount]);

  const pause = useCallback(() => {
    useVisceraStore.getState().setPlaying(false);
  }, []);

  const next = useCallback(() => {
    const store = useVisceraStore.getState();
    store.setStep(Math.min(store.activeStepIndex + 1, stepCount - 1));
  }, [stepCount]);

  const prev = useCallback(() => {
    const store = useVisceraStore.getState();
    store.setStep(Math.max(store.activeStepIndex - 1, 0));
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      const store = useVisceraStore.getState();
      store.setStep(Math.max(0, Math.min(index, stepCount - 1)));
    },
    [stepCount],
  );

  const activeStep = flow?.steps[activeStepIndex] ?? null;
  const parentFlowIds = flow?.flowParentIds ?? [];

  return {
    activeStepIndex,
    activeStep,
    stepCount,
    isPlaying,
    play,
    pause,
    next,
    prev,
    goToStep,
    parentFlowIds,
  };
}
