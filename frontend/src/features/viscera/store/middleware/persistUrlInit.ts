import { applyUrlSearchParams } from './persistUrlCodec';

import type { VisceraStore } from '../visceraStore';
import type { StoreApi } from 'zustand';

/**
 * URL Persistence Middleware: URL → Store hydration.
 *
 * Reads URL search parameters on store initialization and mirrors them
 * into the Viscera store. Called once at store creation time.
 */
export function initPersistUrl(store: StoreApi<VisceraStore>): void {
  if (typeof window === 'undefined') return;

  const search = window.location.search;
  if (!search) return;

  applyUrlSearchParams(store, search);
}
