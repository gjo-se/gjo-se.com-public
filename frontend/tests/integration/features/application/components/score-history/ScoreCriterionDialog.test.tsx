import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ScoreCriterionDialog from '@src/features/application/components/score-history/ScoreCriterionDialog';

import { renderWithProviders } from '../../../integrationTestUtils';

import { CRITERION_ORDER } from '@src/features/application/shared/applicationScoreLabels';
import type { ApplicationScoreRunOut } from '@src/features/application/services/applicationScoreService';

/** Builds a scored run with one missing and one covered must requirement. */
function makeRun(): ApplicationScoreRunOut {
  return {
    id: 1,
    applicationSubmissionId: 1,
    projectId: 1,
    weightsVersion: '1',
    totalScore: 78,
    verdict: 'ready',
    llmCallLogId: null,
    createdAt: '2026-10-01T08:00:00Z',
    completedAt: '2026-10-01T08:01:00Z',
    requirements: [
      { text: 'TypeScript', kind: 'must', covered: false, cv_evidence: null },
      { text: 'React', kind: 'must', covered: true, cv_evidence: 'React' },
      { text: 'GraphQL', kind: 'nice', covered: null, cv_evidence: null },
    ],
    criteria: CRITERION_ORDER.map((key, index) => ({
      id: index + 1,
      criterionKey: key,
      groupKey: 'inhalt',
      value: 0.8,
      weight: 10,
      reason: null,
      evidence: null,
      action: null,
    })),
    groups: [],
    assessed_weight: 100,
    missing_keys: [],
    is_lower_bound: false,
    normalizedScore: 78,
    isConclusive: true,
  };
}

describe('ScoreCriterionDialog', () => {
  it('summarizes total score, coverage and verdict', () => {
    renderWithProviders(
      <ScoreCriterionDialog run={makeRun()} onOpenChange={vi.fn()} />,
    );

    expect(screen.getByText('Gesamt 78.00')).toBeInTheDocument();
    expect(screen.getByText('Coverage 100 %')).toBeInTheDocument();
    expect(
      screen.getByText('voraussichtlich maschinen-vorauswahl-fähig'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 von 2 Muss-Anforderungen nicht im CV/),
    ).toBeInTheDocument();
  });

  it('lists the must and nice requirements with their coverage', () => {
    renderWithProviders(
      <ScoreCriterionDialog run={makeRun()} onOpenChange={vi.fn()} />,
    );

    expect(screen.getByText('Muss: TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Muss: React')).toBeInTheDocument();
    expect(screen.getByText('Kann: GraphQL')).toBeInTheDocument();
    expect(screen.getByText('nicht im CV')).toBeInTheDocument();
    expect(screen.getByText('im CV')).toBeInTheDocument();
  });

  it('enables the skill batch only after selecting a missing must requirement', () => {
    renderWithProviders(
      <ScoreCriterionDialog
        run={makeRun()}
        onOpenChange={vi.fn()}
        submissionId={1}
      />,
    );

    const addButton = screen.getByRole('button', { name: 'Jetzt Skills hinzufügen' });
    expect(addButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText('TypeScript auswählen'));

    expect(addButton).toBeEnabled();
  });

  it('toggles the methodology panel', () => {
    renderWithProviders(
      <ScoreCriterionDialog run={makeRun()} onOpenChange={vi.fn()} />,
    );

    expect(screen.queryByRole('heading', { name: 'Gewichte' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Methodik v1 anzeigen' }));

    expect(screen.getByRole('heading', { name: 'Gewichte' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hard-Facts (Formeln)' })).toBeInTheDocument();
  });

  it('renders nothing without a run', () => {
    renderWithProviders(
      <ScoreCriterionDialog run={null} onOpenChange={vi.fn()} />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
