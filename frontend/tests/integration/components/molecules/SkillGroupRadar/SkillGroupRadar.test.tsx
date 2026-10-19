import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SkillGroupRadar from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar';

import type { SkillGroupSkill } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.types';

function skills(count: number): SkillGroupSkill[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Skill ${index}`,
    importance: count - index,
    level_public: 3,
    tags: [],
  }));
}

function renderRadar(overrides: Partial<React.ComponentProps<typeof SkillGroupRadar>> = {}) {
  return render(
    <MemoryRouter>
      <SkillGroupRadar
        group_id={1}
        label="Backend"
        skills={skills(3)}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('SkillGroupRadar', () => {
  it('renders the group label and the radar', () => {
    renderRadar();

    expect(screen.getByText('Backend')).toBeVisible();
    expect(screen.getByRole('button')).toBeVisible();
  });

  it('opens the detail view on click', () => {
    const onClick = vi.fn();
    renderRadar({ onClick });

    screen.getByRole('button').click();

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('opens the detail view with the keyboard', async () => {
    const onClick = vi.fn();
    renderRadar({ onClick });

    screen.getByRole('button').focus();
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders no chart when the group has too few skills', () => {
    const { container } = renderRadar({ skills: skills(1) });

    expect(container.querySelector('canvas')).toBeNull();
  });
});
