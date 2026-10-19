/**
 * Tests: persistUrlCodec
 *
 * Behaviour: URL → store hydration (viewport, world, view, detail/object,
 * flow, badges), URL → store viewport bootstrapping, badge parsing and the
 * complete store → URL encoding incl. defaults and legacy cleanup.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  applyUrlSearchParams,
  buildUrlFromState,
  hydrateViewportFromUrl,
  parseBadgeParams,
} from '@src/features/viscera/store/middleware/persistUrlCodec';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../../helpers';

import type { UrlMappedState } from '@src/features/viscera/store/middleware/persistUrlCodec';

const store = () => useVisceraStore.getState();

function setLocation(search: string): void {
  window.history.replaceState(null, '', `/admin/viscera/views${search}`);
}

function mapped(patch: Partial<UrlMappedState> = {}): UrlMappedState {
  return {
    viewport: { zoom: 1, x: 0, y: 0 },
    source: 'code',
    viewKey: 'SystemContext',
    detailContainerId: null,
    objectId: null,
    objectTab: 'details',
    activeFlowId: null,
    badgeStates: new Map(),
    ...patch,
  };
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/admin/viscera/views');
  resetVisceraStore();
});

describe('hydrateViewportFromUrl', () => {
  it('returns the default viewport without URL params', () => {
    expect(hydrateViewportFromUrl()).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('reads zoom, x and y from the URL', () => {
    setLocation('?zoom=1.5&x=100&y=-200');

    expect(hydrateViewportFromUrl()).toEqual({ x: 100, y: -200, zoom: 1.5 });
  });

  it('keeps an explicit 0 position', () => {
    setLocation('?zoom=2&x=0&y=0');

    expect(hydrateViewportFromUrl()).toEqual({ x: 0, y: 0, zoom: 2 });
  });

  it('falls back to defaults for non-numeric values', () => {
    setLocation('?zoom=abc&x=nope&y=??');

    expect(hydrateViewportFromUrl()).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

describe('parseBadgeParams', () => {
  it('parses typed pairs', () => {
    expect(parseBadgeParams('tag:risk,status:approved,technology:react')).toEqual([
      { type: 'tag', slug: 'risk' },
      { type: 'status', slug: 'approved' },
      { type: 'technology', slug: 'react' },
    ]);
  });

  it('defaults an untyped pair to the tag type', () => {
    expect(parseBadgeParams('risk-high')).toEqual([{ type: 'tag', slug: 'risk-high' }]);
  });

  it('defaults an unknown entity type to tag', () => {
    expect(parseBadgeParams('unknown:value')).toEqual([{ type: 'tag', slug: 'value' }]);
  });

  it('filters out pairs with an empty slug', () => {
    expect(parseBadgeParams('tag:,status:approved')).toEqual([
      { type: 'status', slug: 'approved' },
    ]);
  });
});

describe('applyUrlSearchParams', () => {
  it('applies the viewport when no view is present', () => {
    applyUrlSearchParams(useVisceraStore, '?zoom=2&x=30&y=-10');

    expect(store().viewport).toEqual({ x: 30, y: -10, zoom: 2 });
  });

  it('applies the source before the view key', () => {
    applyUrlSearchParams(useVisceraStore, '?source=golden&view=container-app');

    expect(store().source).toBe('golden');
    expect(store().viewKey).toBe('container-app');
  });

  it('prefers the diagram alias over the view parameter', () => {
    applyUrlSearchParams(useVisceraStore, '?diagram=component-a&view=container-b');

    expect(store().viewKey).toBe('component-a');
  });

  it('re-applies detail and object after the view reset', () => {
    applyUrlSearchParams(
      useVisceraStore,
      '?view=container-app&detail=c1&object=api&object_tab=files',
    );

    expect(store().viewKey).toBe('container-app');
    expect(store().detailContainerId).toBe('c1');
    expect(store().objectId).toBe('api');
    expect(store().objectTab).toBe('files');
  });

  it('maps the legacy element parameter to objectId', () => {
    applyUrlSearchParams(useVisceraStore, '?element=legacy-node');

    expect(store().objectId).toBe('legacy-node');
  });

  it('selects the flow and applies focus/hide badges', () => {
    applyUrlSearchParams(
      useVisceraStore,
      '?flow=checkout&focus=tag:risk,status:x&hide=technology:react',
    );

    expect(store().activeFlowId).toBe('checkout');
    expect(store().badgeStates.get('tag:risk')).toMatchObject({ state: 'focus' });
    expect(store().badgeStates.get('status:x')).toMatchObject({ state: 'focus' });
    expect(store().badgeStates.get('technology:react')).toMatchObject({ state: 'hide' });
    expect(store().activeFilterCount).toBe(3);
  });

  it('is a no-op for an empty search string', () => {
    applyUrlSearchParams(useVisceraStore, '');

    expect(store().viewKey).toBe('SystemContext');
  });
});

describe('buildUrlFromState', () => {
  it('writes zoom/x/y and omits every default field', () => {
    const url = new URL(buildUrlFromState(mapped()));

    expect(url.searchParams.get('zoom')).toBe('1');
    expect(url.searchParams.get('x')).toBe('0');
    expect(url.searchParams.get('y')).toBe('0');
    expect(url.searchParams.has('source')).toBe(false);
    expect(url.searchParams.has('view')).toBe(false);
    expect(url.searchParams.has('object_tab')).toBe(false);
    expect(url.searchParams.has('object')).toBe(false);
    expect(url.searchParams.has('detail')).toBe(false);
    expect(url.searchParams.has('flow')).toBe(false);
  });

  it('rounds zoom to two decimals and positions to integers', () => {
    const url = new URL(
      buildUrlFromState(mapped({ viewport: { zoom: 1.234, x: 12.6, y: -12.4 } })),
    );

    expect(url.searchParams.get('zoom')).toBe('1.23');
    expect(url.searchParams.get('x')).toBe('13');
    expect(url.searchParams.get('y')).toBe('-12');
  });

  it('writes non-default source, view, detail, object, tab, flow and badges', () => {
    const badges = new Map([
      ['tag:risk', { entityType: 'tag' as const, slug: 'risk', state: 'focus' as const }],
      ['status:x', { entityType: 'status' as const, slug: 'x', state: 'hide' as const }],
    ]);
    const url = new URL(
      buildUrlFromState(
        mapped({
          source: 'golden',
          viewKey: 'container-app',
          detailContainerId: 'c1',
          objectId: 'api',
          objectTab: 'files',
          activeFlowId: 'checkout',
          badgeStates: badges,
        }),
      ),
    );

    expect(url.searchParams.get('source')).toBe('golden');
    expect(url.searchParams.get('view')).toBe('container-app');
    expect(url.searchParams.get('detail')).toBe('c1');
    expect(url.searchParams.get('object')).toBe('api');
    expect(url.searchParams.get('object_tab')).toBe('files');
    expect(url.searchParams.get('flow')).toBe('checkout');
    expect(url.searchParams.get('focus')).toBe('tag:risk');
    expect(url.searchParams.get('hide')).toBe('status:x');
  });

  it('retains the reserved overlay flag', () => {
    window.history.replaceState(null, '', '/admin/viscera/views?overlay=true');

    const url = new URL(buildUrlFromState(mapped()));

    expect(url.searchParams.get('overlay')).toBe('true');
  });

  it('removes the deprecated diagram alias and legacy element parameter', () => {
    window.history.replaceState(null, '', '/admin/viscera/views?diagram=old&element=old');

    const url = new URL(buildUrlFromState(mapped()));

    expect(url.searchParams.has('diagram')).toBe(false);
    expect(url.searchParams.has('element')).toBe(false);
  });
});
