import { fireEvent, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import ScoreHistory from '@src/features/application/components/score-history/ScoreHistory';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { renderWithProviders } from '../../../integrationTestUtils';

describe('ScoreHistory', () => {
  it('shows the baseline empty state without score runs', async () => {
    worker.use(
      http.get(`${base}/admin/application-score/by-submission/:submissionId`, () =>
        HttpResponse.json([]),
      ),
    );

    renderWithProviders(<ScoreHistory submissionId={1} />);

    expect(
      await screen.findByText(/Noch kein Score/),
    ).toBeInTheDocument();
  });

  it('renders the run history with coverage and total score', async () => {
    renderWithProviders(<ScoreHistory submissionId={1} />);

    expect(await screen.findByText('78.00')).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('Gesamt')).toBeInTheDocument();
    expect(screen.getByText('Gewichte fix v1, Schwellen heuristisch, nicht kalibriert.')).toBeInTheDocument();
  });

  it('starts a new score run when the trigger is clicked', async () => {
    const post = vi.fn();
    worker.use(
      http.post(`${base}/admin/application-score`, async ({ request }) => {
        post(await request.json());
        return HttpResponse.json({ id: 2 });
      }),
    );

    renderWithProviders(<ScoreHistory submissionId={1} />);
    expect(await screen.findByText('78.00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Score berechnen' }));

    await vi.waitFor(() =>
      expect(post).toHaveBeenCalledWith({ submission_id: 1 }),
    );
  });

  it('opens the criterion details for a run', async () => {
    renderWithProviders(<ScoreHistory submissionId={1} />);
    expect(await screen.findByText('78.00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));

    expect(await screen.findByText('Score-Details')).toBeInTheDocument();
  });
});
