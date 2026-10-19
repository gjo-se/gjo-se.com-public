/**
 * Tests: experienceDialogFormValues.toFormValues
 *
 * Verifies the create defaults and the API → form mapping (camelCase keys,
 * both locales, missing translations).
 */

import { describe, expect, it } from 'vitest';

import { toFormValues } from '@src/features/application-profile/utils/experienceDialogFormValues';

import type { ExperienceOut } from '@src/lib/api/applicationProfile';

const experience = {
  id: 1,
  position: 'Senior Developer',
  company: 'Acme',
  projectUrl: 'https://acme.test',
  startDate: '2024-03-01',
  endDate: '2024-11-30',
  sort: 1,
  translations: {
    de: { context: 'DACH', problem: 'Legacy', stack: 'TYPO3', outcome: 'Migration' },
    en: { context: 'Europe' },
  },
} as unknown as ExperienceOut;

describe('toFormValues', () => {
  it('returns empty values for a new experience', () => {
    const values = toFormValues(null);

    expect(values.position).toBe('');
    expect(values.company).toBe('');
    expect(values.start_date).toBe('');
    expect(values.translations.de.context).toBe('');
    expect(values.translations.en.context).toBe('');
  });

  it('maps the project fields and both locales', () => {
    const values = toFormValues(experience);

    expect(values).toMatchObject({
      position: 'Senior Developer',
      company: 'Acme',
      project_url: 'https://acme.test',
      start_date: '2024-03-01',
      end_date: '2024-11-30',
    });
    expect(values.translations.de.context).toBe('DACH');
    expect(values.translations.de.problem).toBe('Legacy');
    expect(values.translations.en.context).toBe('Europe');
  });

  it('fills missing locale fields with empty strings', () => {
    const values = toFormValues(experience);

    expect(values.translations.en.outcome).toBe('');
    expect(values.translations.en.tech_stack).toBe('');
  });
});
