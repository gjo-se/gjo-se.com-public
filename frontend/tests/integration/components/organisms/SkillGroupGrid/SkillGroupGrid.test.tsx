import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SkillGroupGrid from '@src/components/organisms/SkillGroupGrid/SkillGroupGrid';

import type { SkillGroupSkill } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.types';

function skill(name: string): SkillGroupSkill {
  return { name, importance: 3, level_public: 3, tags: [] };
}

const groups = [
  { id: 1, sort: 1, priority: 'high', label: 'Backend' },
  { id: 2, sort: 2, priority: 'medium', label: 'Leer' },
];

const skillsByGroup: Record<number, SkillGroupSkill[]> = {
  1: [skill('Node.js'), skill('PostgreSQL')],
  2: [],
};

function renderGrid(overrides: Partial<React.ComponentProps<typeof SkillGroupGrid>> = {}) {
  return render(
    <MemoryRouter>
      <SkillGroupGrid groups={groups} skillsByGroup={skillsByGroup} onOpenSlide={vi.fn()} {...overrides} />
    </MemoryRouter>,
  );
}

describe('SkillGroupGrid', () => {
  it('renders one card per non-empty group with its badges', () => {
    renderGrid();

    expect(screen.getByText('Backend')).toBeVisible();
    expect(screen.getByText('2 Skills')).toBeVisible();
    expect(screen.getByText('Node.js')).toBeVisible();
    expect(screen.queryByText('Leer')).not.toBeInTheDocument();
  });

  it('uses a stable anchor id per group', () => {
    renderGrid();

    expect(document.getElementById('backend')).not.toBeNull();
  });

  it('opens the lightbox for the clicked group', async () => {
    const onOpenSlide = vi.fn();
    renderGrid({ onOpenSlide });

    await userEvent.click(screen.getByRole('button', { name: 'Backend: Radar öffnen' }));

    expect(onOpenSlide).toHaveBeenCalledWith(1);
  });

  it('opens the lightbox with the keyboard', () => {
    const onOpenSlide = vi.fn();
    renderGrid({ onOpenSlide });

    screen.getByRole('button', { name: 'Backend: Radar öffnen' }).focus();
    screen.getByRole('button', { name: 'Backend: Radar öffnen' }).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );

    expect(onOpenSlide).toHaveBeenCalledWith(1);
  });
});
