/**
 * experienceDialogFormValues – API-Modelle → Dialog-Form-Werte.
 *
 * Kapselt die Reset/Prefill-Richtung (Erfahrungs-Projekt → Form-Werte) für
 * `ExperienceDialog`. Die Gegenrichtung (Form-Werte → API-Payload) und die
 * Sub-Tabellen-Zeilen leben im Dialog selbst.
 */

import type {
  ExperienceLocaleFields,
  ExperienceOut,
} from '@src/lib/api/applicationProfile';

/** Dialog-local form values for one experience project. */
export interface ExperienceFormValues {
  position: string;
  company: string;
  project_url: string;
  start_date: string;
  end_date: string;
  translations: { de: ExperienceLocaleValues; en: ExperienceLocaleValues };
}

/** Dialog-local text blocks for one locale. */
export interface ExperienceLocaleValues {
  context: string;
  outcome: string;
  problem: string;
  scope: string;
  solution_what: string;
  tech_stack: string;
  evidence: string;
}

/** Builds the form values from an existing project (empty on create). */
export function toFormValues(experience: ExperienceOut | null): ExperienceFormValues {
  return {
    position: experience?.position ?? '',
    company: experience?.company ?? '',
    project_url: experience?.projectUrl ?? '',
    start_date: experience?.startDate ?? '',
    end_date: experience?.endDate ?? '',
    translations: {
      de: toLocaleValues(experience?.translations?.de),
      en: toLocaleValues(experience?.translations?.en),
    },
  };
}

/** Builds the locale form values from an existing translation (empty on create). */
function toLocaleValues(fields: ExperienceLocaleFields | undefined): ExperienceLocaleValues {
  return {
    context: fields?.context ?? '',
    outcome: fields?.outcome ?? '',
    problem: fields?.problem ?? '',
    scope: fields?.scope ?? '',
    solution_what: fields?.solution_what ?? '',
    tech_stack: fields?.tech_stack ?? '',
    evidence: fields?.evidence ?? '',
  };
}
