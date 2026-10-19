import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ProjectChartFilters from '@src/components/organisms/ProjectChartFilters/ProjectChartFilters';

const jobRoles = [
  { id: 1, name: 'Fullstack Developer' },
  { id: 2, name: 'Backend Developer' },
];

describe('ProjectChartFilters', () => {
  it('renders the title and the range buttons', () => {
    render(<ProjectChartFilters filterProps={{}} />);

    expect(screen.getByText('Eingestellte Projekte je KW')).toBeVisible();
    expect(screen.getByRole('button', { name: '1 Q' })).toBeVisible();
    expect(screen.getByRole('button', { name: '2 Q' })).toBeVisible();
    expect(screen.getByRole('button', { name: '1 J' })).toBeVisible();
  });

  it('reports the selected range', async () => {
    const onWeeksChange = vi.fn();
    render(<ProjectChartFilters filterProps={{ onWeeksChange, selectedWeeks: 13 }} />);

    await userEvent.click(screen.getByRole('button', { name: '2 Q' }));

    expect(onWeeksChange).toHaveBeenCalledWith(26);
  });

  it('marks the active range', () => {
    render(<ProjectChartFilters filterProps={{ selectedWeeks: 26 }} />);

    expect(screen.getByRole('button', { name: '2 Q' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '1 Q' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the selected job role', async () => {
    const onJobRoleChange = vi.fn();
    render(
      <ProjectChartFilters
        filterProps={{ jobRoles, selectedJobRole: null, onJobRoleChange }}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Bitte wählen/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Backend Developer' }));

    expect(onJobRoleChange).toHaveBeenCalledWith('2');
  });
});
