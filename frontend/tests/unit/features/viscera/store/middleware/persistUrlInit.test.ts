/**
 * Tests: persistUrlInit
 *
 * Behaviour: on initialization the current URL search string is applied to the
 * store; without a search string the store stays untouched.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { initPersistUrl } from '@src/features/viscera/store/middleware/persistUrlInit';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../../helpers';

const store = () => useVisceraStore.getState();

beforeEach(() => {
  window.history.replaceState(null, '', '/admin/viscera/views');
  resetVisceraStore();
});

describe('initPersistUrl', () => {
  it('hydrates the store from the current URL', () => {
    window.history.replaceState(null, '', '/admin/viscera/views?view=container-app&object=api');

    initPersistUrl(useVisceraStore);

    expect(store().viewKey).toBe('container-app');
    expect(store().objectId).toBe('api');
  });

  it('hydrates the world and flow from the URL', () => {
    window.history.replaceState(null, '', '/admin/viscera/views?source=golden&flow=checkout');

    initPersistUrl(useVisceraStore);

    expect(store().source).toBe('golden');
    expect(store().activeFlowId).toBe('checkout');
  });

  it('does nothing when the URL has no search string', () => {
    initPersistUrl(useVisceraStore);

    expect(store().viewKey).toBe('SystemContext');
    expect(store().objectId).toBeNull();
  });
});
