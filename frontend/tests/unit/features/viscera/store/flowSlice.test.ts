/**
 * Tests: flowSlice
 *
 * Behaviour: selecting a flow resets the step and stops playback, manual step
 * navigation stops playback, while the auto-play step setter leaves playback
 * untouched.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../helpers';

const store = () => useVisceraStore.getState();

beforeEach(() => {
  resetVisceraStore();
});

describe('flowSlice', () => {
  it('starts with no flow, step 0 and playback stopped', () => {
    expect(store().activeFlowId).toBeNull();
    expect(store().activeStepIndex).toBe(0);
    expect(store().isPlaying).toBe(false);
  });

  it('selecting a flow resets the step and stops playback', () => {
    store().setStep(3);
    store().setPlaying(true);

    store().selectFlow('checkout');

    expect(store().activeFlowId).toBe('checkout');
    expect(store().activeStepIndex).toBe(0);
    expect(store().isPlaying).toBe(false);
  });

  it('deselecting a flow sets the id back to null', () => {
    store().selectFlow('checkout');

    store().selectFlow(null);

    expect(store().activeFlowId).toBeNull();
  });

  it('manual step navigation stops playback', () => {
    store().setPlaying(true);

    store().setStep(2);

    expect(store().activeStepIndex).toBe(2);
    expect(store().isPlaying).toBe(false);
  });

  it('auto-play step updates leave the playback state untouched', () => {
    store().setPlaying(true);

    store().setActiveStepIndex(4);

    expect(store().activeStepIndex).toBe(4);
    expect(store().isPlaying).toBe(true);
  });

  it('stores the playback flag explicitly', () => {
    store().setPlaying(true);
    expect(store().isPlaying).toBe(true);

    store().setPlaying(false);
    expect(store().isPlaying).toBe(false);
  });
});
