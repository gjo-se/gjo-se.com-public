/**
 * Tests: useBulkValidation
 *
 * Verifies whole-workspace validation: valid workspaces pass, schema violations
 * are mapped to field + owning object id, and `applyFieldEdit` mutates a deep
 * clone only (objects and people).
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  applyFieldEdit,
  useBulkValidation,
} from '@src/features/viscera/viewer/hooks/useBulkValidation';

import {
  makeObject,
  makeWorkspace,
  makeWorkspaceWrapper,
} from '../../helpers';

import type { Workspace } from '@src/features/viscera/core/workspaceSchema';

const validWorkspace = makeWorkspace({
  objects: [makeObject({ id: 'backend', name: 'Backend', type: 'system' })],
  edges: [{ from: 'backend', to: 'backend' }],
});

function invalidWorkspace(): Workspace {
  return makeWorkspace({
    objects: [{ id: 'backend', type: 'system' } as never],
  });
}

describe('useBulkValidation', () => {
  it('accepts a valid workspace', () => {
    const wrapper = makeWorkspaceWrapper(validWorkspace);
    const { result } = renderHook(() => useBulkValidation(), { wrapper });

    expect(result.current.validate()).toEqual({ valid: true, errors: [] });
  });

  it('accepts when no workspace is available at all', () => {
    const wrapper = makeWorkspaceWrapper(null);
    const { result } = renderHook(() => useBulkValidation(), { wrapper });

    expect(result.current.validate()).toEqual({ valid: true, errors: [] });
  });

  it('reports the field and owning object id for a schema violation', () => {
    const wrapper = makeWorkspaceWrapper(validWorkspace);
    const { result } = renderHook(() => useBulkValidation(), { wrapper });

    const validation = result.current.validate(invalidWorkspace());

    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toMatchObject({ field: 'name', objectId: 'backend' });
    expect(validation.errors[0]?.message).toEqual(expect.any(String));
  });

  it('applies a field edit to a cloned object', () => {
    const edited = applyFieldEdit(validWorkspace, 'backend', 'name', 'Renamed');

    expect(edited.objects?.[0]?.name).toBe('Renamed');
    expect(validWorkspace.objects?.[0]?.name).toBe('Backend');
  });

  it('applies a field edit to a cloned person', () => {
    const workspace = makeWorkspace({
      people: [makeObject({ id: 'greg', name: 'Greg', type: 'person' })],
    });

    const edited = applyFieldEdit(workspace, 'greg', 'name', 'Gregory');

    expect(edited.people?.[0]?.name).toBe('Gregory');
    expect(workspace.people?.[0]?.name).toBe('Greg');
  });

  it('returns an unchanged clone for an unknown object id', () => {
    const edited = applyFieldEdit(validWorkspace, 'unknown', 'name', 'Ignored');

    expect(edited).toEqual(validWorkspace);
    expect(edited).not.toBe(validWorkspace);
  });
});
