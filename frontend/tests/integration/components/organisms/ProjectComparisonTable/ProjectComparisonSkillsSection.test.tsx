import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ProjectComparisonSkillsSection from '@src/components/organisms/ProjectComparisonTable/ProjectComparisonSkillsSection';

import type { ComparisonColumn, SkillBadgeItem } from '@src/lib/api/aiscopeTypes';

function skill(id: number, overrides: Partial<SkillBadgeItem> = {}): SkillBadgeItem {
  return {
    id,
    name: `Skill ${id}`,
    effective_importance: 3,
    level: 3,
    level_public: 3,
    status: 'active',
    ...overrides,
  };
}

function column(skills: SkillBadgeItem[]): ComparisonColumn {
  return {
    id: 1,
    canonical: true,
    scoreLabel: 'Kanonisch',
    scoreChip: true,
    title: 'Testprojekt',
    titleNormalized: null,
    city: 'Berlin',
    country: 'DE',
    duration: '6 Monate',
    start: '01/2026',
    remote: '100 %',
    remoteWarn: false,
    jobRole: 'Developer',
    contractType: 'Contracting',
    contractWarn: false,
    postedAt: '01.01.2026',
    postedAtWarn: false,
    freelancermapId: 1,
    freelancermapUrl: null,
    agency: 'Agentur',
    contactName: 'Kontakt',
    description: null,
    skills,
    callLogId: null,
    endcustomer: '–',
    industry: null,
    hourlyRate: null,
    myHourlyRate: null,
    myStartDate: null,
  };
}

const skills = [
  skill(1, { effective_importance: 5, name: 'Muss-Skill' }),
  skill(2, { effective_importance: 3, name: 'Nice-Skill' }),
  skill(3, { effective_importance: 2, name: 'Alter Skill', status: 'deprecated' }),
];

describe('ProjectComparisonSkillsSection', () => {
  it('renders the skill count and the three groups', () => {
    render(
      <ProjectComparisonSkillsSection
        master={column(skills)}
        canonicalProjectId={1}
        onRefetch={vi.fn()}
      />,
    );

    expect(screen.getByText('Skills (3)')).toBeVisible();
    expect(screen.getByText(/Must.Have \(1\)/)).toBeVisible();
    expect(screen.getByText(/Nice.to.have \(1\)/)).toBeVisible();
    expect(screen.getByText('Archiviert (1)')).toBeVisible();
  });

  it('opens the archived list and blacklists a skill', async () => {
    const onScoreChange = vi.fn();
    render(
      <ProjectComparisonSkillsSection
        master={column(skills)}
        canonicalProjectId={1}
        onRefetch={vi.fn()}
        onScoreChange={onScoreChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Archiviert/ }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Alter Skill auf Blacklist setzen' }),
    );

    await waitFor(() => expect(onScoreChange).toHaveBeenCalledWith(82, 78, 76));
  });

  it('renders the empty archived hint without archived skills', () => {
    render(
      <ProjectComparisonSkillsSection
        master={column([skill(1)])}
        onRefetch={vi.fn()}
      />,
    );

    expect(screen.getByText('Archiviert (0)')).toBeVisible();
    expect(screen.getAllByText('–').length).toBeGreaterThan(0);
  });
});
