/**
 * Tests: withLocaleRoutes – EN twins derived from the route config.
 *
 * Every configured DE path must gain its EN slug; unknown paths get the /en
 * prefix and the root maps to /en.
 */
import { describe, expect, it } from 'vitest';

import withLocaleRoutes from '@src/lib/withLocaleRoutes';

import type { RouteObject } from 'react-router';

/**
 * Returns the paths of the generated locale children.
 *
 * @param routes - Input routes.
 * @returns Child paths in input order.
 */
function localeChildPaths(routes: RouteObject[]): (string | undefined)[] {
  const [, localeWrapper] = withLocaleRoutes(routes);

  return (localeWrapper.children ?? []).map((route) => route.path);
}

describe('withLocaleRoutes', () => {
  it('behält die Original-Routen unverändert an erster Stelle', () => {
    const routes: RouteObject[] = [{ path: '/about' }];

    const result = withLocaleRoutes(routes);

    expect(result[0]).toEqual({ path: '/about' });
    expect(result).toHaveLength(2);
  });

  it('leitet den englischen Slug aus der Route-Config ab', () => {
    expect(localeChildPaths([{ path: '/about' }])).toEqual(['/en/about']);
  });

  it('präfixt unbekannte Pfade mit dem Locale-Prefix', () => {
    expect(localeChildPaths([{ path: '/custom' }])).toEqual(['/en/custom']);
  });

  it('bildet den Root auf den englischen Root ab', () => {
    expect(localeChildPaths([{ path: '/' }])).toEqual(['/en']);
  });

  it('lässt Routen ohne Pfad ohne Pfad', () => {
    expect(localeChildPaths([{}])).toEqual([undefined]);
  });
});
