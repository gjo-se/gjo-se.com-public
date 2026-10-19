import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ProjectCombobox from '@src/components/molecules/ProjectCombobox/ProjectCombobox';

import type { Project } from '@src/lib/api/aiscope';

const project = {
  id: 12,
  title: 'Cloud Migration',
  city: 'Leipzig',
} as Project;

describe('ProjectCombobox', () => {
  it('renders a project result as id, title and city', async () => {
    render(
      <ProjectCombobox
        placeholder="Projekt suchen…"
        emptyText="Keine Projekte"
        onSearch={vi.fn().mockResolvedValue([project])}
        onLink={vi.fn().mockResolvedValue(undefined)}
        confirmMessage={(p) => `Projekt ${p.id} verknüpfen?`}
        onLinked={vi.fn()}
      />,
    );

    await userEvent.fill(screen.getByPlaceholderText('Projekt suchen…'), 'Cloud');

    expect(
      await screen.findByRole('option', { name: '12 – Cloud Migration (Leipzig)' }),
    ).toBeVisible();
  });

  it('uses the supplied confirmation message before linking', async () => {
    const onLink = vi.fn().mockResolvedValue(undefined);
    render(
      <ProjectCombobox
        placeholder="Projekt suchen…"
        emptyText="Keine Projekte"
        onSearch={vi.fn().mockResolvedValue([{ ...project, city: null }])}
        onLink={onLink}
        confirmMessage={(p) => `Projekt #${p.id} verknüpfen?`}
        onLinked={vi.fn()}
      />,
    );

    await userEvent.fill(screen.getByPlaceholderText('Projekt suchen…'), 'Cloud');
    await userEvent.click(
      await screen.findByRole('option', { name: '12 – Cloud Migration (–)' }),
    );

    expect(await screen.findByText('Projekt #12 verknüpfen?')).toBeVisible();
    screen.getByRole('button', { name: 'Bestätigen' }).click();

    expect(onLink).toHaveBeenCalledWith(expect.objectContaining({ id: 12 }));
  });
});
