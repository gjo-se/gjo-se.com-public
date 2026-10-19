import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SkillGroupRadarModal from '@src/components/organisms/SkillGroupRadarModal/SkillGroupRadarModal';

import type { SkillGroupSlide } from '@src/components/organisms/SkillGroupRadarModal/SkillGroupRadarModal.types';

const groups: SkillGroupSlide[] = [
  {
    id: 1,
    label: 'Backend',
    skills: [
      { name: 'Node.js', importance: 4, level_public: 3, tags: [] },
      { name: 'PostgreSQL', importance: 3, level_public: 4, tags: [] },
    ],
  },
  {
    id: 2,
    label: 'Frontend',
    skills: [
      { name: 'React', importance: 5, level_public: 4, tags: [] },
      { name: 'TypeScript', importance: 4, level_public: 5, tags: [] },
    ],
  },
];

function renderModal(overrides: Partial<React.ComponentProps<typeof SkillGroupRadarModal>> = {}) {
  return render(
    <MemoryRouter>
      <SkillGroupRadarModal
        open
        onOpenChange={vi.fn()}
        groups={groups}
        initialGroupId={1}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('SkillGroupRadarModal', () => {
  it('renders nothing while closed', () => {
    const { container } = renderModal({ open: false });

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the initial group and the slide counter', () => {
    renderModal();

    expect(screen.getByRole('dialog', { name: 'Radar-Detailansicht' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Backend' })).toBeVisible();
    expect(screen.getByText('1 / 2')).toBeVisible();
  });

  it('navigates to the next group', async () => {
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Nächste Gruppe' }));

    expect(screen.getByRole('heading', { name: 'Frontend' })).toBeVisible();
    expect(screen.getByText('2 / 2')).toBeVisible();
  });

  it('navigates with the keyboard and closes on Escape', async () => {
    const onOpenChange = vi.fn();
    renderModal({ onOpenChange });

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByText('2 / 2')).toBeVisible();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('closes through the close button', async () => {
    const onOpenChange = vi.fn();
    renderModal({ onOpenChange });

    await userEvent.click(screen.getByRole('button', { name: 'Schließen' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables navigation with a single group', () => {
    renderModal({ groups: [groups[0]!] });

    expect(screen.getByRole('button', { name: 'Vorherige Gruppe' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nächste Gruppe' })).toBeDisabled();
  });
});
