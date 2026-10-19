import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SkillCategoryNav from '@src/components/molecules/SkillCategoryNav/SkillCategoryNav';

import type { SkillGroupSkill } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.types';

function skill(name: string): SkillGroupSkill {
  return { name, importance: 3, level_public: 3, tags: [] };
}

const groups = [
  { id: 2, sort: 2, priority: 'medium', label: 'Architektur' },
  { id: 1, sort: 1, priority: 'high', label: 'Clean Code' },
];

const skillsByGroup: Record<number, SkillGroupSkill[]> = {
  1: [skill('Refactoring')],
  2: [],
};

describe('SkillCategoryNav', () => {
  it('renders one linked chip per non-empty group in sort order', () => {
    render(
      <MemoryRouter>
        <SkillCategoryNav groups={groups} skillsByGroup={skillsByGroup} />
      </MemoryRouter>,
    );

    const chips = screen.getAllByRole('link');
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveTextContent('Clean Code');
    expect(chips[0]).toHaveAttribute('href', '#clean-code');
  });

  it('reports the selected group when a chip is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <SkillCategoryNav
          groups={groups}
          skillsByGroup={skillsByGroup}
          onSelect={onSelect}
        />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('link', { name: 'Clean Code' }));

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('marks the active group chip', () => {
    render(
      <MemoryRouter>
        <SkillCategoryNav
          groups={groups}
          skillsByGroup={skillsByGroup}
          activeGroupId={1}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Clean Code' })).toBeVisible();
  });
});
