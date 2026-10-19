import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SkillGroupSkillSortDialog from '@src/features/fbf/skill/components/skill-group-skill-sort-dialog/SkillGroupSkillSortDialog';

describe('SkillGroupSkillSortDialog', () => {
  it('renders the group label and its skills', async () => {
    render(
      <SkillGroupSkillSortDialog
        open
        onOpenChange={() => undefined}
        groupId={1}
        groupLabel="Backend"
      />,
    );

    expect(
      await screen.findByText('Skills sortieren – Backend'),
    ).toBeInTheDocument();
    expect(await screen.findByText('TypeScript')).toBeInTheDocument();
  });

  it('saves the new order and closes the dialog', async () => {
    const onOpenChange = vi.fn();
    render(
      <SkillGroupSkillSortDialog
        open
        onOpenChange={onOpenChange}
        groupId={1}
        groupLabel="Backend"
      />,
    );

    expect(await screen.findByText('TypeScript')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Speichern' }).click();

    await vi.waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('closes without saving on cancel', async () => {
    const onOpenChange = vi.fn();
    render(
      <SkillGroupSkillSortDialog
        open
        onOpenChange={onOpenChange}
        groupId={1}
        groupLabel="Backend"
      />,
    );

    screen.getByRole('button', { name: 'Abbrechen' }).click();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders nothing while closed', () => {
    render(
      <SkillGroupSkillSortDialog
        open={false}
        onOpenChange={() => undefined}
        groupId={1}
        groupLabel="Backend"
      />,
    );

    expect(screen.queryByText('Skills sortieren – Backend')).not.toBeInTheDocument();
  });
});
