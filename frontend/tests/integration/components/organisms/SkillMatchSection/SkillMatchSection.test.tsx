import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import SkillMatchSection from '@src/components/organisms/SkillMatchSection/SkillMatchSection';

import type { RadarSkill } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.types';

function skills(count: number): RadarSkill[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Skill ${index}`,
    importance: count - index,
    level_public: 3,
  }));
}

function renderSection(overrides: Partial<React.ComponentProps<typeof SkillMatchSection>> = {}) {
  return render(
    <MemoryRouter>
      <SkillMatchSection
        skills={skills(3)}
        onOpenSlide={vi.fn()}
        title="Match"
        subtitle="Passung zum Projekt"
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('SkillMatchSection', () => {
  it('renders title and subtitle below the radar', () => {
    renderSection();

    expect(screen.getByRole('heading', { name: 'Match' })).toBeVisible();
    expect(screen.getByText('Passung zum Projekt')).toBeVisible();
  });

  it('opens the lightbox on the match slide', async () => {
    const onOpenSlide = vi.fn();
    renderSection({ onOpenSlide });

    screen.getByRole('button', { name: 'Match-Radar vergrößern' }).click();

    expect(onOpenSlide).toHaveBeenCalledOnce();
  });

  it('opens the lightbox with the keyboard', () => {
    const onOpenSlide = vi.fn();
    renderSection({ onOpenSlide });

    const chart = screen.getByRole('button', { name: 'Match-Radar vergrößern' });
    chart.focus();
    chart.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onOpenSlide).toHaveBeenCalledOnce();
  });

  it('renders the fallback without enough skills', () => {
    renderSection({ skills: skills(1) });

    expect(screen.queryByRole('button', { name: 'Match-Radar vergrößern' })).not.toBeInTheDocument();
  });

  it('renders the legend', () => {
    renderSection();

    expect(screen.getByText('Importance')).toBeVisible();
    expect(screen.getByText('Level')).toBeVisible();
  });
});
