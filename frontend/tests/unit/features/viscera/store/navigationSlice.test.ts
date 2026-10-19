/**
 * Tests: navigationSlice
 *
 * Behaviour: defaults, full context reset on a world or view change, derived
 * diagram lifecycle, detail/object selection and last-URL bookmarks.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { makeDiagram, resetVisceraStore } from '../helpers';

const store = () => useVisceraStore.getState();

function primeContext(): void {
  store().setViewKey('container-app');
  store().setDetailContainer('container-node');
  store().setObjectId('api');
  store().setObjectTab('files');
  store().setViewport({ x: 100, y: 50, zoom: 2 });
  store().setDerivedDiagram(makeDiagram({ key: 'derived' }));
}

beforeEach(() => {
  resetVisceraStore();
});

describe('navigationSlice – defaults', () => {
  it('starts on the code world, SystemContext view and details tab', () => {
    expect(store().source).toBe('code');
    expect(store().viewKey).toBe('SystemContext');
    expect(store().detailContainerId).toBeNull();
    expect(store().objectId).toBeNull();
    expect(store().objectTab).toBe('details');
    expect(store().derivedDiagram).toBeNull();
    expect(store().lastUrl).toEqual({});
  });
});

describe('navigationSlice – setSource', () => {
  it('resets the whole navigation context when the world changes', () => {
    primeContext();

    store().setSource('golden');

    expect(store().source).toBe('golden');
    expect(store().viewKey).toBe('SystemContext');
    expect(store().detailContainerId).toBeNull();
    expect(store().objectId).toBeNull();
    expect(store().objectTab).toBe('details');
    expect(store().derivedDiagram).toBeNull();
    expect(store().viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('keeps the navigation context when the source is unchanged', () => {
    primeContext();

    store().setSource('code');

    expect(store().viewKey).toBe('container-app');
    expect(store().objectId).toBe('api');
    expect(store().viewport).toEqual({ x: 100, y: 50, zoom: 2 });
  });
});

describe('navigationSlice – setViewKey', () => {
  it('resets detail, object, tab, derived diagram and viewport', () => {
    primeContext();

    store().setViewKey('component-app');

    expect(store().viewKey).toBe('component-app');
    expect(store().detailContainerId).toBeNull();
    expect(store().objectId).toBeNull();
    expect(store().objectTab).toBe('details');
    expect(store().derivedDiagram).toBeNull();
    expect(store().viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

describe('navigationSlice – derived diagram', () => {
  it('sets and clears the ephemeral derived diagram', () => {
    const derived = makeDiagram({ key: 'sys-components' });

    store().setDerivedDiagram(derived);
    expect(store().derivedDiagram).toEqual(derived);

    store().clearDerivedDiagram();
    expect(store().derivedDiagram).toBeNull();
  });
});

describe('navigationSlice – detail and object selection', () => {
  it('stores the detail container independently of the object', () => {
    store().setDetailContainer('container-a');
    store().setObjectId('api');

    expect(store().detailContainerId).toBe('container-a');
    expect(store().objectId).toBe('api');

    store().setDetailContainer(null);
    store().setObjectId(null);
    expect(store().detailContainerId).toBeNull();
    expect(store().objectId).toBeNull();
  });

  it('stores the object tab', () => {
    store().setObjectTab('annotations');

    expect(store().objectTab).toBe('annotations');
  });
});

describe('navigationSlice – last URL bookmarks', () => {
  it('stores and removes a bookmark per view key', () => {
    store().setLastUrl('SystemContext', '/admin/viscera/views?zoom=2');
    store().setLastUrl('container-app', '/admin/viscera/views?view=container-app');

    expect(store().lastUrl).toEqual({
      SystemContext: '/admin/viscera/views?zoom=2',
      'container-app': '/admin/viscera/views?view=container-app',
    });

    store().clearLastUrl('SystemContext');

    expect(store().lastUrl).toEqual({
      'container-app': '/admin/viscera/views?view=container-app',
    });
  });

  it('overwrites an existing bookmark for the same view key', () => {
    store().setLastUrl('SystemContext', '/old');
    store().setLastUrl('SystemContext', '/new');

    expect(store().lastUrl.SystemContext).toBe('/new');
  });

  it('ignores clearing an unknown view key', () => {
    store().setLastUrl('SystemContext', '/x');

    store().clearLastUrl('unknown');

    expect(store().lastUrl).toEqual({ SystemContext: '/x' });
  });
});
