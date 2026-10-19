import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ImpactTable from '@src/components/organisms/SkillAnalysis/ImpactTable';

import type { ImpactPoint } from '@src/lib/api/aiscope';

function point(overrides: Partial<ImpactPoint>): ImpactPoint {
  return {
    skill_id: 1,
    skill_name: 'Terraform',
    project_count: 3,
    avg_importance: 3,
    curated_importance: 3,
    blended_importance: 3,
    level: 2,
    impact: 10,
    current_match: 20,
    simulated_match: 25,
    match_delta: 5,
    ...overrides,
  };
}

describe('ImpactTable', () => {
  it('shows the loading hint while the points are loading', () => {
    render(
      <ImpactTable
        points={[]}
        loading
        selectedSkills={[]}
        onSelectedSkillsChange={() => {}}
      />,
    );

    expect(screen.getByText('Lädt…')).toBeVisible();
  });

  it('shows a hint when no skill needs learning', () => {
    render(
      <ImpactTable
        points={[point({ level: 5 })]}
        loading={false}
        selectedSkills={[]}
        onSelectedSkillsChange={() => {}}
      />,
    );

    expect(screen.getByText('Keine Skills mit Lernbedarf.')).toBeVisible();
  });

  it('renders the impact summary and the ranked skills', async () => {
    render(
      <ImpactTable
        points={[point({}), point({ skill_id: 2, skill_name: 'Kubernetes', impact: 5, match_delta: 2 })]}
        loading={false}
        selectedSkills={[]}
        onSelectedSkillsChange={() => {}}
      />,
    );

    expect(
      screen.getByText('Aktuell: 20 Projekte (letzte 4 Wo.) mit ≥75% Match'),
    ).toBeVisible();
    expect(await screen.findByText('Terraform')).toBeVisible();
    expect(await screen.findByText('Kubernetes')).toBeVisible();
  });
});
