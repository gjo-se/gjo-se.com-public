import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SkillRadar from '@src/components/molecules/SkillRadar/SkillRadar';

import type { SkillRadarItem } from '@src/components/molecules/SkillRadar/SkillRadar.types';

function item(id: number, overrides: Partial<SkillRadarItem> = {}): SkillRadarItem {
  return {
    id,
    name: `Skill ${id}`,
    effective_importance: 4,
    level: 3,
    level_public: 3,
    status: 'active',
    ...overrides,
  };
}

describe('SkillRadar', () => {
  it('renders the group label with its skill count', () => {
    render(<SkillRadar label="Backend" skills={[item(1), item(2)]} />);

    expect(screen.getByText('Backend (2)')).toBeVisible();
  });

  it('falls back to a compact list below the radar threshold', () => {
    render(<SkillRadar label="Backend" skills={[item(1), item(2)]} />);

    expect(screen.getByText('Skill 1')).toBeVisible();
    expect(screen.getByText('Skill 2')).toBeVisible();
  });

  it('renders a radar for enough confirmed skills', () => {
    render(
      <SkillRadar
        label="Backend"
        skills={[item(1), item(2), item(3), item(4)]}
      />,
    );

    expect(screen.queryByText('Skill 1')).not.toBeInTheDocument();
  });

  it('opens the detail view when the radar is clicked', async () => {
    const onClick = vi.fn();
    render(
      <SkillRadar
        label="Backend"
        skills={[item(1), item(2), item(3)]}
        onClick={onClick}
      />,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows a hint when no confirmed skill with level exists', () => {
    render(
      <SkillRadar
        label="Backend"
        skills={[item(1, { status: 'deprecated', level: null })]}
      />,
    );

    expect(screen.getByText('Keine Skills mit Level')).toBeVisible();
  });

  it('lists archived skills separately', () => {
    render(
      <SkillRadar
        label="Backend"
        skills={[item(1), item(2), item(3), item(4, { status: 'deprecated' })]}
      />,
    );

    expect(screen.getByText(/Skill 4/)).toBeVisible();
  });
});
