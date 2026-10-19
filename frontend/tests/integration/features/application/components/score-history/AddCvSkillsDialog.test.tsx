import { fireEvent, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import AddCvSkillsDialog from '@src/features/application/components/score-history/AddCvSkillsDialog';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { renderWithProviders } from '../../../integrationTestUtils';

describe('AddCvSkillsDialog', () => {
  it('renders one editable row per selected skill', () => {
    renderWithProviders(
      <AddCvSkillsDialog
        open
        onOpenChange={vi.fn()}
        submissionId={1}
        skills={['TypeScript', 'React']}
      />,
    );

    const inputs = screen.getAllByLabelText('Skill-Name');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('TypeScript');
    expect(inputs[1]).toHaveValue('React');
  });

  it('sends the edited skill names as one batch and closes', async () => {
    let body: unknown = null;
    worker.use(
      http.post(
        `${base}/admin/application-submissions/:id/cv-skills`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ id: 1 });
        },
      ),
    );
    const onOpenChange = vi.fn();
    const onAdded = vi.fn();

    renderWithProviders(
      <AddCvSkillsDialog
        open
        onOpenChange={onOpenChange}
        submissionId={7}
        skills={['TypeScript']}
        onAdded={onAdded}
      />,
    );

    fireEvent.change(screen.getByLabelText('Skill-Name'), {
      target: { value: 'TypeScript (advanced)' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Jetzt Skills hinzufügen' }),
    );

    await waitFor(() =>
      expect(body).toEqual({ items: [{ name: 'TypeScript (advanced)' }] }),
    );
    expect(onAdded).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables the submit for an empty skill name', () => {
    renderWithProviders(
      <AddCvSkillsDialog
        open
        onOpenChange={vi.fn()}
        submissionId={1}
        skills={['TypeScript']}
      />,
    );

    fireEvent.change(screen.getByLabelText('Skill-Name'), {
      target: { value: '   ' },
    });

    expect(
      screen.getByRole('button', { name: 'Jetzt Skills hinzufügen' }),
    ).toBeDisabled();
  });

  it('keeps the dialog open and reports the error when the batch add fails', async () => {
    worker.use(
      http.post(`${base}/admin/application-submissions/:id/cv-skills`, () =>
        HttpResponse.json({ detail: 'Pipeline down' }, { status: 500 }),
      ),
    );
    const onOpenChange = vi.fn();

    renderWithProviders(
      <AddCvSkillsDialog
        open
        onOpenChange={onOpenChange}
        submissionId={1}
        skills={['TypeScript']}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Jetzt Skills hinzufügen' }),
    );

    await waitFor(() => expect(onOpenChange).not.toHaveBeenCalledWith(false));
  });
});
