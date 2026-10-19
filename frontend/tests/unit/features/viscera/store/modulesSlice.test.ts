/**
 * Tests: modulesSlice
 *
 * Behaviour: module load lifecycle (loading/success/error/reset), L4 focus
 * mode, collapse toggling and the combined filter reset.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../helpers';

import type { ImportModule } from '@src/features/viscera/core/modulesSchema';

const store = () => useVisceraStore.getState();

const MODULES: ImportModule[] = [
  { name: 'app.api', path: 'app/api.py', imports: ['app.db'], top_level: 'app' },
  { name: 'app.db', path: 'app/db.py', imports: [], top_level: 'app' },
];

beforeEach(() => {
  resetVisceraStore();
});

describe('modulesSlice – load lifecycle', () => {
  it('marks loading and clears a previous error', () => {
    store().setModulesError('boom');

    store().setModulesLoading();

    expect(store().modulesLoading).toBe(true);
    expect(store().modulesError).toBeNull();
  });

  it('stores modules, system and top level on success', () => {
    store().setModulesLoading();

    store().setModulesSuccess(MODULES, 'gjo-se.com', 'app');

    expect(store().modules).toEqual(MODULES);
    expect(store().system).toBe('gjo-se.com');
    expect(store().topLevel).toBe('app');
    expect(store().modulesLoading).toBe(false);
    expect(store().modulesError).toBeNull();
  });

  it('accepts a null top level (global module list)', () => {
    store().setModulesSuccess(MODULES, 'gjo-se.com', null);

    expect(store().topLevel).toBeNull();
  });

  it('stores an error and stops loading', () => {
    store().setModulesLoading();

    store().setModulesError('HTTP 500');

    expect(store().modulesError).toBe('HTTP 500');
    expect(store().modulesLoading).toBe(false);
  });

  it('resets the module data while keeping the filters untouched', () => {
    store().setModulesSuccess(MODULES, 'gjo-se.com', 'app');
    store().setModuleFocus('app.api', 'focus');

    store().resetModules();

    expect(store().modules).toEqual([]);
    expect(store().system).toBeNull();
    expect(store().topLevel).toBeNull();
    expect(store().focusModuleId).toBe('app.api');
  });
});

describe('modulesSlice – focus and collapse filters', () => {
  it('sets and clears the focus with its mode', () => {
    store().setModuleFocus('app.api', 'reaches');
    expect(store().focusModuleId).toBe('app.api');
    expect(store().focusMode).toBe('reaches');

    store().clearModuleFocus();
    expect(store().focusModuleId).toBeNull();
    expect(store().focusMode).toBeNull();
  });

  it('toggles collapse on and off without duplicates', () => {
    store().toggleModuleCollapse('app.api');
    store().toggleModuleCollapse('app.api');
    store().toggleModuleCollapse('app.db');

    expect(store().collapsedIds).toEqual(['app.db']);
  });

  it('resets focus, mode and all collapsed ids together', () => {
    store().setModuleFocus('app.api', 'impact');
    store().toggleModuleCollapse('app.api');

    store().resetModuleFilters();

    expect(store().focusModuleId).toBeNull();
    expect(store().focusMode).toBeNull();
    expect(store().collapsedIds).toEqual([]);
  });
});
