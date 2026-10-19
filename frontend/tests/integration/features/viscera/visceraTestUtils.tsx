/**
 * Shared render helpers for the viscera integration tests.
 *
 * Provides a deterministic workspace context (no HTTP) plus a router, so the
 * components under test can be exercised through their public interface.
 */
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { WorkspaceContext } from '@src/features/viscera/core/useWorkspace';

import type { WorkspaceContextValue } from '@src/features/viscera/core/useWorkspace';
import type { ObjectDetail } from '@src/features/viscera/viewer/hooks/useObjectDetail';
import type {
  ArchitectureObject,
  Diagram,
  Group,
  Workspace,
} from '@src/features/viscera/core/workspaceSchema';
import type { ReactElement } from 'react';

/** Minimal valid workspace – all collections present so derived logic never sees undefined. */
export const EMPTY_WORKSPACE: Workspace = {
  id: 'gjo-se',
  name: 'gjo-se.com',
  description: 'Test workspace',
  people: [],
  objects: [],
  diagrams: [],
  groups: [],
  edges: [],
  flows: [],
  styles: [],
};

/** Builds a persisted diagram with sane defaults. */
export function makeDiagram(overrides: Partial<Diagram> = {}): Diagram {
  return {
    key: 'system-context',
    name: 'System Context',
    type: 'systemContext',
    description: '',
    parent: null,
    source: 'code',
    base: null,
    layout: null,
    nodes: {},
    status: 'approved',
    scan_meta: null,
    ...overrides,
  };
}

/** Builds a workspace with overrides merged over the empty baseline. */
export function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return { ...EMPTY_WORKSPACE, ...overrides };
}

/** Builds an architecture object with sane defaults. */
export function makeObject(overrides: Partial<ArchitectureObject> = {}): ArchitectureObject {
  const id = overrides.id ?? 'backend';
  return {
    id,
    name: 'Backend',
    description: '',
    type: 'container',
    external: false,
    ...overrides,
  };
}

/** Builds a group with sane defaults. */
export function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 'group-backend',
    name: 'Backend',
    description: '',
    members: [],
    ...overrides,
  };
}

/** Builds a fully populated object detail for panel/dialog tests. */
export function makeObjectDetail(overrides: Partial<ObjectDetail> = {}): ObjectDetail {
  return {
    objectId: 'backend',
    name: 'Backend',
    type: 'container',
    description: 'Backend container',
    tags: ['backend'],
    technologies: [],
    status: 'active',
    parentId: null,
    parentName: null,
    scope: null,
    diagrams: [],
    flows: [],
    childrenCount: 0,
    annotations: [],
    technologyCandidates: [],
    typeLabel: 'Container',
    typeOptions: [
      { value: 'container', label: 'Container' },
      { value: 'store', label: 'Store' },
    ],
    fields: [
      { label: 'Name', value: 'Backend', field: 'name', editable: true },
      { label: 'Description', value: 'Backend container', field: 'description', editable: true },
    ],
    isDerived: false,
    ...overrides,
  };
}

/** Builds a workspace context value without any I/O. */
export function createWorkspaceValue(
  workspace: Workspace | null = EMPTY_WORKSPACE,
): WorkspaceContextValue {
  return {
    workspace,
    error: null,
    loading: false,
    reload: () => undefined,
    updateWorkspace: () => undefined,
    resetToServer: () => undefined,
  };
}

export interface RenderWithWorkspaceOptions {
  workspace?: Workspace | null;
  value?: WorkspaceContextValue;
  route?: string;
}

/** Renders a component inside a router and a workspace context. */
export function renderWithWorkspace(
  ui: ReactElement,
  { workspace = EMPTY_WORKSPACE, value, route = '/' }: RenderWithWorkspaceOptions = {},
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <WorkspaceContext.Provider value={value ?? createWorkspaceValue(workspace)}>
        {ui}
      </WorkspaceContext.Provider>
    </MemoryRouter>,
  );
}
