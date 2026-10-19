import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SkillGroupHero from '@src/components/organisms/SkillGroupHero/SkillGroupHero';

import type { RadarSkill } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.types';

function skills(count: number): RadarSkill[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Skill ${index}`,
    importance: count - index,
    level_public: 3,
  }));
}

function renderHero(overrides: Partial<React.ComponentProps<typeof SkillGroupHero>> = {}) {
  return render(
    <MemoryRouter>
      <SkillGroupHero
        skills={skills(3)}
        onOpenSlide={vi.fn()}
        openSlideTarget={0}
        title="Kompetenzen"
        usp="Sofort einsatzbereit"
        subline="Von Backend bis Frontend."
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('SkillGroupHero', () => {
  it('renders the headline, usp and subline', () => {
    renderHero();

    expect(screen.getByRole('heading', { name: 'Kompetenzen' })).toBeVisible();
    expect(screen.getByText('Sofort einsatzbereit')).toBeVisible();
    expect(screen.getByText('Von Backend bis Frontend.')).toBeVisible();
  });

  it('opens the lightbox on the configured slide', async () => {
    const onOpenSlide = vi.fn();
    renderHero({ onOpenSlide, openSlideTarget: 4 });

    await userEvent.click(screen.getByRole('button', { name: 'Radar vergrößern' }));

    expect(onOpenSlide).toHaveBeenCalledWith(4);
  });

  it('renders the fallback without enough skills', () => {
    renderHero({ skills: skills(1) });

    expect(screen.getByText('Zu wenige Skills für den Radar.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Radar vergrößern' })).not.toBeInTheDocument();
  });

  it('renders the colour legend', () => {
    renderHero();

    expect(screen.getByText('Importance (Soll)')).toBeVisible();
    expect(screen.getByText('Level (Ist)')).toBeVisible();
  });
});
