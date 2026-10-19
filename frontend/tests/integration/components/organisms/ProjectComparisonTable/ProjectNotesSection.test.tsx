import { render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ProjectNotesSection from '@src/components/organisms/ProjectComparisonTable/ProjectNotesSection';
import { worker } from '@src/mocks/browser';

describe('ProjectNotesSection', () => {
  it('renders the existing notes', () => {
    render(
      <ProjectNotesSection projectId={1} notes="**Wichtige** Notiz" onRefetch={vi.fn()} />,
    );

    expect(screen.getByText('Wichtige')).toBeVisible();
  });

  it('shows an empty hint without notes', () => {
    render(<ProjectNotesSection projectId={1} notes={null} onRefetch={vi.fn()} />);

    expect(screen.getByText('Keine Bemerkungen vorhanden.')).toBeVisible();
  });

  it('saves the edited notes with Ctrl+Enter', async () => {
    let body: unknown;
    worker.use(
      http.patch('/api/v1/admin/fbf/projects/:id/notes', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({});
      }),
    );
    const onRefetch = vi.fn();
    render(<ProjectNotesSection projectId={1} notes={null} onRefetch={onRefetch} />);

    await userEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));
    await userEvent.fill(screen.getByLabelText('Bemerkungen (Markdown)'), 'Neue Notiz');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    await waitFor(() => expect(onRefetch).toHaveBeenCalledOnce());
    expect(body).toEqual({ notes: 'Neue Notiz' });
  });

  it('discards the draft with Escape', async () => {
    const onRefetch = vi.fn();
    render(<ProjectNotesSection projectId={1} notes="Alte Notiz" onRefetch={onRefetch} />);

    await userEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));
    await userEvent.fill(screen.getByLabelText('Bemerkungen (Markdown)'), 'Verworfen');
    await userEvent.keyboard('{Escape}');

    expect(onRefetch).not.toHaveBeenCalled();
    expect(screen.getByText('Alte Notiz')).toBeVisible();
  });
});
