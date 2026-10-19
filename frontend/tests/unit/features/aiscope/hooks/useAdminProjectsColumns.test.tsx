/**
 * Tests: useAdminProjectsColumns – Spalten-Vertrag am Public Interface.
 *
 * Kein Netz, keine Interna: der Hook baut nur Spalten-Definitionen.
 */
import { render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAdminProjectsColumns } from '@src/features/aiscope/hooks/useAdminProjectsColumns';

import type { UseAdminProjectsColumnsParams } from '@src/features/aiscope/hooks/useAdminProjectsColumns';

const params: UseAdminProjectsColumnsParams = {
  llmFilter: '',
  jobRoleItems: [{ value: '1', label: 'Frontend' }],
  jobRoleFilter: null,
  endcustomerFilter: null,
  minScoreFilter: null,
  myProjects: false,
  preset: 'open',
  onLlmChange: vi.fn(),
  onJobRoleChange: vi.fn(),
  onEndcustomerChange: vi.fn(),
  onMinScoreChange: vi.fn(),
  onToggleMyProjects: vi.fn(),
  onPresetChange: vi.fn(),
};

describe('useAdminProjectsColumns', () => {
  it('exposes all project table columns with labels', () => {
    const { result } = renderHook(() => useAdminProjectsColumns(params));

    expect(result.current.id.label).toBe('ID');
    expect(result.current.title.label).toBe('Titel');
    expect(result.current.jobRole.label).toBe('JobRole');
    expect(result.current.matchScore.label).toBe('Score');
    expect(result.current.hourlyRate.label).toBe('€/h');
    expect(result.current.statusCell.label).toBe('Status');
  });

  it('sorts the posted-at column descending by default', () => {
    const { result } = renderHook(() => useAdminProjectsColumns(params));

    expect(result.current.postedAt.defaultSort).toBe('desc');
    expect(result.current.matchScore.defaultSort).toBe('desc');
  });

  it('renders the hourly rate or a dash', () => {
    const { result } = renderHook(() => useAdminProjectsColumns(params));

    const { container } = render(
      <table>
        <tbody>
          <tr>
            <td>{result.current.hourlyRate.renderCell?.({ hourlyRate: 95 })}</td>
            <td>{result.current.hourlyRate.renderCell?.({ hourlyRate: null })}</td>
          </tr>
        </tbody>
      </table>,
    );

    expect(container.textContent).toContain('95');
    expect(container.textContent).toContain('–');
  });

  it('renders the inline score filter from the current value', () => {
    const { result } = renderHook(() =>
      useAdminProjectsColumns({ ...params, minScoreFilter: 60, myProjects: true }),
    );

    const filter = result.current.matchScore.filter;
    const filterElement = typeof filter === 'function' ? filter({}) : filter;
    const { container } = render(<div>{filterElement}</div>);

    expect(container.querySelector('input[type="number"]')).toHaveValue(60);
    expect(container.textContent).toContain('Meine Projekte ✓');
  });
});
