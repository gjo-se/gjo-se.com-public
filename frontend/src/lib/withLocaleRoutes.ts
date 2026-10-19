import { Outlet } from 'react-router';

import { routeConfig } from '@src/router.config';

import type { RouteObject } from 'react-router';

/** Maps a DE route path to its language-specific EN path (from routeConfig, SSOT). */
const localePath = (path: string): string | undefined => {
  const entry = Object.values(routeConfig).find((e) => e.path === path);
  return entry && 'en' in entry ? entry.en : undefined;
};

/**
 * Generates EN locale variants for all given routes.
 * Each route gets an /en/* twin nested under an Outlet, using the
 * language-specific EN slug from routeConfig (falls back to /en${path}).
 * The active language is derived from the URL (see useLanguage).
 */
export default function withLocaleRoutes(routes: RouteObject[]): RouteObject[] {
  return [
    ...routes,
    {
      Component: Outlet,
      children: routes.map((r) => ({
        ...r,
        path: r.path ? localePath(r.path) ?? (r.path === '/' ? '/en' : `/en${r.path}`) : r.path,
      })),
    },
  ];
}
