/**
 * Tests: useProjectComparison
 *
 * Prüft das Laden des Master-Projekts samt Slaves.
 * Der Service wird gemockt, um den Hook isoliert zu testen.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchProjectById,
  fetchProjectSlaves,
} from '@src/lib/api/aiscope';

import { useProjectComparison } from '@src/features/aiscope/hooks/useProjectComparison';

import type { Project } from '@src/lib/api/aiscope';
import type { ProjectStatus } from '@src/features/aiscope/core/types';

vi.mock('@src/lib/api/aiscope', () => ({
  fetchProjectById: vi.fn(),
  fetchProjectSlaves: vi.fn(),
  streamDescriptionMerge: vi.fn(),
}));

const mockedFetchById = vi.mocked(fetchProjectById);
const mockedFetchSlaves = vi.mocked(fetchProjectSlaves);

const projectDefaults: Project = {
  id: 0,
  canonical_id: null,
  similarity_score: null,
  match_score: null,
  confirmed_score: null,
  public_score: null,
  url: 'https://example.com',
  title: 'Master Project',
  title_normalized: null,
  description: null,
  merged_description_de: null,
  merged_at: null,
  last_merge_call_log_id: null,
  city: null,
  country: null,
  remote_percent: null,
  contract_type: null,
  duration: null,
  start_date: null,
  posted_at: null,
  scraped_at: null,
  search_term: null,
  job_role_name: null,
  merge_dirty: false,
  company_name: null,
  contact_name: null,
  industry: null,
  notes: null,
  hourly_rate: null,
  my_hourly_rate: null,
  my_start_date: null,
  endcustomer: null,
  endcustomer_researched_at: null,
  skills: [],
  slave_count: 0,
  freelancermap_id: null,
  status: 'new',
  status_color_token: null,
};

function buildProject(overrides: Partial<Project> & { id: number; status: ProjectStatus }): Project {
  return Object.assign({}, projectDefaults, overrides);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useProjectComparison – loading', () => {
  it('loads the master project and its slaves without changing its status', async () => {
    const master = buildProject({ id: 5, status: 'new' });
    mockedFetchById.mockResolvedValue(master);
    // Slaves are fetched for the master's id – derive them from it so the
    // loaded group is observable instead of asserting the mock interaction.
    mockedFetchSlaves.mockImplementation((masterId: number) =>
      Promise.resolve([buildProject({ id: masterId + 1, status: 'new' })]),
    );

    const { result } = renderHook(() => useProjectComparison('5'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canonical?.id).toBe(5);
    expect(result.current.slaves.map((slave) => slave.id)).toEqual([6]);
    expect(result.current.status).toBe('new');
  });
});

describe('useProjectComparison – raw-dataset link', () => {
  it('links the raw dataset via the freelancermap id, not the internal project id', async () => {
    const master = buildProject({ id: 3061, status: 'new', freelancermap_id: 3319 });
    mockedFetchById.mockResolvedValue(master);
    mockedFetchSlaves.mockResolvedValue([]);

    const { result } = renderHook(() => useProjectComparison('3061'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.columns[0].freelancermapId).toBe(3319);
    expect(result.current.columns[0].freelancermapUrl).toBe('/admin/aiscope/freelancermap/3319');
  });

  it('hides the raw-dataset link when the project has no raw entry', async () => {
    const master = buildProject({ id: 5000, status: 'new' });
    mockedFetchById.mockResolvedValue(master);
    mockedFetchSlaves.mockResolvedValue([]);

    const { result } = renderHook(() => useProjectComparison('5000'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.columns[0].freelancermapId).toBeNull();
    expect(result.current.columns[0].freelancermapUrl).toBeNull();
  });
});
