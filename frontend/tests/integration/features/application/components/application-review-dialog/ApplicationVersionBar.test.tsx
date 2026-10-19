import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ApplicationVersionBar from '@src/features/application/components/application-review-dialog/ApplicationVersionBar';

import type {
  ApplicationSubmissionListOut,
  Language,
} from '@src/features/application/services/applicationService';

/** Builds one application version row with sane defaults. */
function makeVersion(overrides: Partial<ApplicationSubmissionListOut> = {}): ApplicationSubmissionListOut {
  return {
    id: 1,
    projectId: 1,
    projectTitle: 'Senior Fullstack Developer',
    projectTitleNormalized: 'Senior Fullstack Developer',
    subject: 'Bewerbung: Senior Fullstack Developer',
    language: 'de',
    recipientEmail: 'contact@example.com',
    recipientDisplayName: 'Alex Beispiel',
    recipientCompanyName: 'Example GmbH',
    recipientPersonId: 1,
    recipientCompanyId: 1,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    status: null,
    isCurrent: true,
    lastScore: 78,
    lastVerdict: 'ready',
    lastScoredAt: '2026-10-01T08:00:00Z',
    ...overrides,
  };
}

const VERSIONS: ApplicationSubmissionListOut[] = [
  makeVersion(),
  makeVersion({ id: 2, language: 'en', isCurrent: false, lastScore: 55 }),
];

/** Renders the bar with inert handlers. */
function renderBar(overrides: Partial<Parameters<typeof ApplicationVersionBar>[0]> = {}) {
  return render(
    <ApplicationVersionBar
      applications={VERSIONS}
      currentId={1}
      language="de"
      preparing={false}
      onSelect={vi.fn()}
      onLanguageChange={vi.fn()}
      onPrepareNew={vi.fn()}
      {...overrides}
    />,
  );
}

describe('ApplicationVersionBar', () => {
  it('labels the versions with language, date and score', () => {
    renderBar();

    expect(
      screen.getByRole('option', { name: /DE · .* · 78 \(aktuell\)/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /EN · .* · 55/ }),
    ).toBeInTheDocument();
  });

  it('reports the selected version', () => {
    const onSelect = vi.fn();
    renderBar({ onSelect });

    fireEvent.change(screen.getByLabelText('Bewerbungsversion'), {
      target: { value: '2' },
    });

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('reports a language change', () => {
    const onLanguageChange = vi.fn();
    renderBar({ onLanguageChange });

    fireEvent.change(screen.getByLabelText('Sprache der Bewerbung'), {
      target: { value: 'en' },
    });

    expect(onLanguageChange).toHaveBeenCalledWith<[Language]>('en');
  });

  it('prepares a new application', () => {
    const onPrepareNew = vi.fn();
    renderBar({ onPrepareNew });

    fireEvent.click(
      screen.getByRole('button', { name: 'Weitere Bewerbung vorbereiten' }),
    );

    expect(onPrepareNew).toHaveBeenCalledTimes(1);
  });

  it('disables all controls while preparing', () => {
    renderBar({ preparing: true });

    expect(screen.getByLabelText('Bewerbungsversion')).toBeDisabled();
    expect(screen.getByLabelText('Sprache der Bewerbung')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Wird vorbereitet …' }),
    ).toBeDisabled();
  });
});
