import type { NonProdEnv } from './EnvBar.types';

export const CONFIG: Record<
  NonProdEnv,
  { label: string; dot: string; bar: string; text: 'success-subtle' | 'warning-subtle'; border: string }
> = {
  dev: {
    label: 'DEV',
    dot: 'bg-success',
    bar: 'bg-success-subtle-bg',
    text: 'success-subtle',
    border: 'border-b-success-subtle-border',
  },
  test: {
    label: 'TEST',
    dot: 'bg-warning',
    bar: 'bg-warning-subtle-bg',
    text: 'warning-subtle',
    border: 'border-b-warning-subtle-border',
  },
};

export const FAVICONS: Record<NonProdEnv, string> = {
  dev: '/favicon-dev.svg',
  test: '/favicon-test.svg',
};

export const PROD_FAVICON = '/favicon.svg';

/** Setzt den Browser-Tab-Favicon-<link> auf den übergebenen Pfad. */
export function setFavicon(href: string): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) link.href = href;
}
