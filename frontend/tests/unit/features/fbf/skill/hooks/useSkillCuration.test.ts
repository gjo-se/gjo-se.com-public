/**
 * Tests: useSkillCuration
 *
 * Verifies the server-side load (filters + pagination), URL-driven filter
 * mapping, ghost-row creation, delete guards, bulk confirmation and the error
 * path at the public hook interface. Only the HTTP boundary is faked.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SKILLS_CHANGED_EVENT } from '@src/features/fbf/skill/hooks/useSkillPendingCount';
import { useSkillCuration } from '@src/features/fbf/skill/hooks/useSkillCuration';

import { httpBoundary } from '../../helpers/httpBoundary';
import { createWrapper } from '../../helpers/query';

import type { SkillAdminOut } from '@src/features/fbf/skill/services/curation';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary: boundary } = await import('../../helpers/httpBoundary');
  return { default: boundary.api, api: boundary.api };
});

const SKILLS_URL = '/admin/fbf/skill';
const COUNT_URL = '/admin/fbf/skill/count';

const referencedSkill = {
  id: 1,
  name: 'TypeScript',
  description: 'Typed JavaScript',
  group_id: 2,
  project_count: 3,
  project_percentage: 25,
  avg_project_importance: 3.5,
  importance: 4,
  level: 3,
  level_public: 2,
  tags: [{ name: 'frontend' }],
  status: 'pending',
  status_color_token: 'amber',
} as SkillAdminOut;

const freeSkill = {
  id: 2,
  name: 'Rust',
  description: null,
  group_id: null,
  project_count: 0,
  project_percentage: 0,
  avg_project_importance: null,
  importance: null,
  level: null,
  level_public: null,
  tags: [],
  status: 'active',
  status_color_token: 'green',
} as SkillAdminOut;

let skills: SkillAdminOut[] = [];

beforeEach(() => {
  httpBoundary.reset();
  skills = [referencedSkill, freeSkill];
  window.history.replaceState(null, '', '/');
  localStorage.clear();
  httpBoundary.on('get', SKILLS_URL, () => skills);
  httpBoundary.on('get', COUNT_URL, () => skills.length);
  httpBoundary.on('get', '/admin/tagging/tags', () => []);
  httpBoundary.on('get', '/public/fbf/skill-group', () => []);
});

describe('useSkillCuration – loading', () => {
  it('loads the first page with the default status and master filters', async () => {
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data.map((row) => row.name)).toEqual(['TypeScript', 'Rust']);
    expect(result.current.error).toBeNull();
    expect(httpBoundary.calls.find((call) => call.url === SKILLS_URL)?.params).toMatchObject({
      status: 'active',
      master_filter: 'masters',
      offset: 0,
      limit: 20,
      sort_order: 'desc',
    });
  });

  it('maps URL filters onto the request', async () => {
    window.history.replaceState(null, '', '/?status=pending&master=all');

    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const params = httpBoundary.calls.find((call) => call.url === SKILLS_URL)?.params;
    expect(params?.status).toBe('pending');
    expect(params?.master_filter).toBeUndefined();
  });

  it('reports the generic load error when the request fails', async () => {
    httpBoundary.on('get', SKILLS_URL, () => { throw new Error('offline'); });

    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error).toBe('Fehler beim Laden der Daten.');
    expect(result.current.table.data).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});

describe('useSkillCuration – ghost-row create', () => {
  it('rejects a create without a name', async () => {
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.onGhostCreate({ name: '  ' })).rejects.toThrow('Name ist erforderlich.');
  });

  it('creates the skill with the trimmed name and reloads', async () => {
    httpBoundary.on('post', SKILLS_URL, (call) => ({ id: 3, name: (call.payload as { name: string }).name }));
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const loadsBefore = httpBoundary.calls.filter((call) => call.url === SKILLS_URL).length;

    await expect(result.current.onGhostCreate({ name: '  Go  ' })).resolves.toEqual({ name: 'Go' });

    await waitFor(() => expect(
      httpBoundary.calls.filter((call) => call.url === SKILLS_URL).length,
    ).toBeGreaterThan(loadsBefore));
    expect(httpBoundary.calls.find((call) => call.method === 'post')?.payload).toMatchObject({ name: 'Go' });
  });
});

describe('useSkillCuration – row actions', () => {
  it('disables delete while projects reference the skill', async () => {
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const deleteAction = result.current.rowActions.find((action) => action.key === 'delete');
    const rows = result.current.table.data;

    expect(deleteAction?.disabled?.(rows[0])).toBe(true);
    expect(deleteAction?.disabled?.(rows[1])).toBe(false);
  });

  it('deletes an unreferenced skill and reloads', async () => {
    httpBoundary.on('delete', `${SKILLS_URL}/2`, () => {
      skills = skills.filter((skill) => skill.id !== 2);
      return undefined;
    });
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const deleteAction = result.current.rowActions.find((action) => action.key === 'delete');
    const target = result.current.table.data.find((row) => row.id === 2);
    if (!target) throw new Error('Expected the second skill row');

    await act(async () => { await deleteAction?.onAction(target); });

    expect(httpBoundary.calls.some((call) => call.method === 'delete')).toBe(true);
    await waitFor(() => expect(result.current.table.data.map((row) => row.id)).toEqual([1]));
  });
});

describe('useSkillCuration – bulk confirm', () => {
  it('confirms only pending rows and reloads', async () => {
    httpBoundary.on('post', `${SKILLS_URL}/confirm`, () => 1);
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const confirm = result.current.bulkActions.find((action) => action.key === 'confirm');

    await act(async () => { await confirm?.onAction(result.current.table.data); });

    expect(httpBoundary.calls.find((call) => call.method === 'post')?.payload).toEqual({ ids: [1] });
  });
});

describe('useSkillCuration – external events', () => {
  it('dispatches the skills-changed event after a load', async () => {
    const listener = vi.fn();
    window.addEventListener(SKILLS_CHANGED_EVENT, listener);

    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(listener).toHaveBeenCalled();
    window.removeEventListener(SKILLS_CHANGED_EVENT, listener);
  });
});

describe('useSkillCuration – URL filter mapping', () => {
  it('drops the "all" sentinel for every filter and keeps concrete values', async () => {
    window.history.replaceState(
      null,
      '',
      '/?status=all&tag=all&master=all&minImp=all&minL1=2&minL2=all&minAvg=3&group=all',
    );

    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const params = httpBoundary.calls.find((call) => call.url === SKILLS_URL)?.params;
    expect(params).toMatchObject({
      min_level: '2',
      min_avg_project_importance: '3',
    });
    for (const key of ['status', 'tag', 'master_filter', 'min_importance', 'min_level_public', 'group_id']) {
      expect(params?.[key]).toBeUndefined();
    }
  });

  it('keeps concrete values for every filter', async () => {
    window.history.replaceState(
      null,
      '',
      '/?status=pending&tag=frontend&master=slaves&minImp=1&minL1=2&minL2=3&minAvg=4&group=7',
    );

    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const params = httpBoundary.calls.find((call) => call.url === SKILLS_URL)?.params;
    expect(params).toMatchObject({
      status: 'pending',
      tag: 'frontend',
      master_filter: 'slaves',
      min_importance: '1',
      min_level: '2',
      min_level_public: '3',
      min_avg_project_importance: '4',
      group_id: '7',
    });
  });
});

type AnyProps = Record<string, unknown>;

/** Reads the props of an element returned by a render-prop callback. */
function elementProps(value: unknown): AnyProps {
  return (value as { props: AnyProps }).props;
}

/** Reads a child element of an element returned by a render-prop callback. */
function childProps(value: unknown, index: number): AnyProps {
  return elementProps((elementProps(value).children as unknown[])[index]);
}

/** Returns the request params of the latest skill-list call. */
function lastSkillParams(): Record<string, unknown> | undefined {
  return [...httpBoundary.calls].reverse().find((call) => call.url === SKILLS_URL)?.params;
}

/** Evaluates a column filter and returns its rendered element. */
function filterElement(column: unknown): unknown {
  const filter = (column as { filter?: unknown }).filter;
  return typeof filter === 'function' ? (filter as (state: Record<string, unknown>) => unknown)({}) : filter;
}

/** Evaluates a column render cell for a row and returns its rendered element. */
function renderCellOf(column: unknown, row: unknown): unknown {
  const renderCell = (column as { renderCell?: unknown }).renderCell;
  return (renderCell as (value: unknown) => unknown)(row);
}

describe('useSkillCuration – filter controls', () => {
  it('writes every filter change into the request params', async () => {
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      const status = childProps(filterElement(result.current.columns.name), 0);
      (status.onSelect as (value: string) => void)('pending');
    });
    await waitFor(() => expect(lastSkillParams()?.status).toBe('pending'));

    act(() => {
      const labeledMaster = (elementProps(filterElement(result.current.columns.name)).children as unknown[])[1];
      const master = childProps(labeledMaster, 1);
      (master.onSelect as (value: string) => void)('all');
    });
    await waitFor(() => expect(lastSkillParams()?.master_filter).toBeUndefined());

    act(() => {
      const tag = childProps(filterElement(result.current.columns.tags), 1);
      (tag.onSelect as (value: string) => void)('frontend');
    });
    await waitFor(() => expect(lastSkillParams()?.tag).toBe('frontend'));

    act(() => {
      const group = childProps(filterElement(result.current.columns.group), 1);
      (group.onSelect as (value: string) => void)('7');
    });
    await waitFor(() => expect(lastSkillParams()?.group_id).toBe('7'));

    act(() => {
      const group = childProps(filterElement(result.current.columns.group), 1);
      (group.onSelect as (value: string) => void)('all');
    });
    await waitFor(() => expect(lastSkillParams()?.group_id).toBeUndefined());
  });

  it('maps score filters to params and clears them on null', async () => {
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const scoreFilters = [
      ['importance', 'min_importance', 2],
      ['level', 'min_level', 3],
      ['level_public', 'min_level_public', 4],
      ['avg_project_importance', 'min_avg_project_importance', 5],
    ] as const;

    for (const [column, param, value] of scoreFilters) {
      act(() => {
        const onChange = elementProps(filterElement(result.current.columns[column])).onChange as
          (next: number | null) => void;
        onChange(value);
      });
      await waitFor(() => expect(lastSkillParams()?.[param]).toBe(String(value)));

      act(() => {
        const onChange = elementProps(filterElement(result.current.columns[column])).onChange as
          (next: number | null) => void;
        onChange(null);
      });
      await waitFor(() => expect(lastSkillParams()?.[param]).toBeUndefined());
    }
  });
});

describe('useSkillCuration – cell rendering', () => {
  it('formats the project percentage and renders a dash when it is missing', async () => {
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const row = result.current.table.data[0];

    expect(renderCellOf(result.current.columns.project_count, { ...row, project_percentage: null })).toBe('–');
    expect(renderCellOf(result.current.columns.project_count, { ...row, project_percentage: 25 })).toBe('25,0 %');
  });

  it('renders no cell for rows that are no longer loaded', async () => {
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    for (const column of ['importance', 'level', 'level_public', 'group', 'tags', 'status']) {
      expect(renderCellOf(result.current.columns[column], { id: 999 })).toBeNull();
    }
  });
});

describe('useSkillCuration – inline commits', () => {
  beforeEach(() => {
    httpBoundary.on('put', `${SKILLS_URL}/1`, () => referencedSkill);
  });

  it('renames, re-describes and re-scores a row through the HTTP boundary', async () => {
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const row = result.current.table.data.find((candidate) => candidate.id === 1);
    if (!row) throw new Error('Expected the referenced skill row');

    const nameCell = elementProps(renderCellOf(result.current.columns.name, row));
    await act(async () => { await (nameCell.onRename as (name: string) => Promise<void>)('TypeScript 2'); });
    expect(httpBoundary.calls.find((call) => call.method === 'put')?.payload).toMatchObject({ name: 'TypeScript 2' });

    const descriptionCell = elementProps(renderCellOf(result.current.columns.description, row));
    await act(async () => { await (descriptionCell.onCommit as (value: string | null) => Promise<void>)('Neu'); });
    expect(httpBoundary.calls.filter((call) => call.method === 'put').at(-1)?.payload).toMatchObject({ description: 'Neu' });

    for (const column of ['importance', 'level', 'level_public']) {
      const cell = elementProps(renderCellOf(result.current.columns[column], row));
      await act(async () => { await (cell.onCommit as (value: number | null) => Promise<void>)(5); });
    }

    const groupCell = elementProps(renderCellOf(result.current.columns.group, row));
    await act(async () => { await (groupCell.onCommit as (value: number | null) => Promise<void>)(3); });
    expect(httpBoundary.calls.filter((call) => call.method === 'put').at(-1)?.payload).toMatchObject({ group_id: 3 });
  });

  it('skips commits for unchanged values', async () => {
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const row = result.current.table.data.find((candidate) => candidate.id === 1);
    if (!row) throw new Error('Expected the referenced skill row');
    const putsBefore = httpBoundary.calls.filter((call) => call.method === 'put').length;

    const nameCell = elementProps(renderCellOf(result.current.columns.name, row));
    await act(async () => { await (nameCell.onRename as (name: string) => Promise<void>)('TypeScript'); });
    const scoreCell = elementProps(renderCellOf(result.current.columns.importance, row));
    await act(async () => { await (scoreCell.onCommit as (value: number | null) => Promise<void>)(4); });
    const groupCell = elementProps(renderCellOf(result.current.columns.group, row));
    await act(async () => { await (groupCell.onCommit as (value: number | null) => Promise<void>)(2); });

    expect(httpBoundary.calls.filter((call) => call.method === 'put')).toHaveLength(putsBefore);
  });

  it('reports a save error and reloads', async () => {
    httpBoundary.on('put', `${SKILLS_URL}/1`, () => { throw new Error('offline'); });
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const row = result.current.table.data.find((candidate) => candidate.id === 1);
    if (!row) throw new Error('Expected the referenced skill row');

    const nameCell = elementProps(renderCellOf(result.current.columns.name, row));
    await act(async () => { await (nameCell.onRename as (name: string) => Promise<void>)('TypeScript 2'); });

    expect(httpBoundary.calls.some((call) => call.method === 'put')).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});

describe('useSkillCuration – row and bulk actions', () => {
  it('reloads after a successful tag change', async () => {
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const row = result.current.table.data.find((candidate) => candidate.id === 1);
    if (!row) throw new Error('Expected the referenced skill row');
    const loadsBefore = httpBoundary.calls.filter((call) => call.url === SKILLS_URL).length;

    act(() => {
      const tagsCell = elementProps(renderCellOf(result.current.columns.tags, row));
      (tagsCell.onTagsChanged as () => void)();
    });

    await waitFor(() => expect(
      httpBoundary.calls.filter((call) => call.url === SKILLS_URL).length,
    ).toBeGreaterThan(loadsBefore));
  });

  it('reports a delete failure without reloading', async () => {
    httpBoundary.on('delete', `${SKILLS_URL}/2`, () => { throw new Error('in use'); });
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const deleteAction = result.current.rowActions.find((action) => action.key === 'delete');
    const target = result.current.table.data.find((row) => row.id === 2);
    if (!target) throw new Error('Expected the second skill row');

    await act(async () => { await deleteAction?.onAction(target); });

    expect(httpBoundary.calls.some((call) => call.method === 'delete')).toBe(true);
    expect(result.current.table.data.map((row) => row.id)).toEqual([1, 2]);
  });

  it('skips the reload when the bulk confirm fails', async () => {
    httpBoundary.on('post', `${SKILLS_URL}/confirm`, () => { throw new Error('offline'); });
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const confirm = result.current.bulkActions.find((action) => action.key === 'confirm');
    const loadsBefore = httpBoundary.calls.filter((call) => call.url === SKILLS_URL).length;

    await act(async () => { await confirm?.onAction(result.current.table.data); });

    expect(httpBoundary.calls.filter((call) => call.url === SKILLS_URL)).toHaveLength(loadsBefore);
  });

  it('skips the request when no row needs confirmation', async () => {
    skills = [freeSkill];
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const confirm = result.current.bulkActions.find((action) => action.key === 'confirm');

    await act(async () => { await confirm?.onAction(result.current.table.data); });

    expect(httpBoundary.calls.some((call) => call.method === 'post')).toBe(false);
  });
});

describe('useSkillCuration – edge cases', () => {
  it('accepts empty URL filter values', async () => {
    window.history.replaceState(null, '', '/?status=&tag=&master=&minImp=&minL1=&minL2=&minAvg=&group=');

    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data).toHaveLength(2);
  });

  it('requires a name when creating a skill', async () => {
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.onGhostCreate({})).rejects.toThrow('Name ist erforderlich.');
  });

  it('renders score and group cells for skills without values', async () => {
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const row = result.current.table.data.find((candidate) => candidate.id === 2);
    if (!row) throw new Error('Expected the empty skill row');

    for (const column of ['importance', 'level', 'level_public', 'group']) {
      expect(renderCellOf(result.current.columns[column], row)).not.toBeNull();
    }
  });

  it('keeps a row without a project percentage deletable', async () => {
    skills = [referencedSkill, { ...freeSkill, id: 3, project_percentage: null }];
    const { result } = renderHook(() => useSkillCuration(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const deleteAction = result.current.rowActions.find((action) => action.key === 'delete');
    const row = result.current.table.data.find((candidate) => candidate.id === 3);

    expect(deleteAction?.disabled?.(row!)).toBe(false);
  });
});
