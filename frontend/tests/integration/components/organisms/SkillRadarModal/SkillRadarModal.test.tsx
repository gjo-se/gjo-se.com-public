import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SkillRadarModal from '@src/components/organisms/SkillRadarModal/SkillRadarModal';

import type { SkillRadarItem } from '@src/components/molecules/SkillRadar/SkillRadar.types';

function skill(id: number): SkillRadarItem {
  return {
    id,
    name: `Skill ${id}`,
    effective_importance: 4,
    level: 3,
    level_public: 3,
    status: 'active',
  };
}

describe('SkillRadarModal', () => {
  it('renders nothing while closed', () => {
    const { container } = render(
      <SkillRadarModal open={false} onOpenChange={vi.fn()} label="Backend" skills={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the group title with its skill count', () => {
    render(
      <SkillRadarModal
        open
        onOpenChange={vi.fn()}
        label="Backend"
        skills={[skill(1), skill(2), skill(3)]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Backend – Skills (3)' })).toBeVisible();
  });

  it('shows a hint below the radar threshold', () => {
    render(
      <SkillRadarModal open onOpenChange={vi.fn()} label="Backend" skills={[skill(1)]} />,
    );

    expect(screen.getByText('Zu wenige Skills für Radar.')).toBeVisible();
  });

  it('closes through the footer button', () => {
    const onOpenChange = vi.fn();
    render(
      <SkillRadarModal open onOpenChange={onOpenChange} label="Backend" skills={[skill(1)]} />,
    );

    screen.getByRole('button', { name: 'Schließen' }).click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
