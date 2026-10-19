/**
 * Field builders for the project detail views (Project + Freelancermap).
 *
 * Single Source of Truth for the DetailShell field arrays, shared by
 * `useFreelancermapDetail` (data hook) and `ProjectDetailView` (renderer) so
 * the two builders cannot drift apart.
 */
import type { Project, ProjectFreelancerMap } from '@src/lib/api/aiscope';

import {
  formatContractType,
  formatDuration,
  formatStartDate,
  isLowRemote,
  isOlderThan30Days,
  isRedContractType,
} from '../../../utils/projectFormatters';

/** A badges row in the detail view. */
export interface BadgesField {
  kind: 'badges'
  label: string
  values: string[]
}

export type FieldEntry = TextField | BadgesField;

/** A plain text row in the detail view. */
export interface TextField {
  kind: 'text'
  label: string
  value: string | null | undefined
  warn?: boolean
  chipVariant?: 'success' | 'muted'
}

/** Builds the detail field array for a raw Freelancermap project. */
export function buildFreelancermapFields(project: ProjectFreelancerMap): FieldEntry[] {
  return [
    { kind: 'text', label: 'ID (intern)', value: String(project.id) },
    { kind: 'text', label: 'Portal-ID', value: project.external_id },
    { kind: 'text', label: 'URL', value: project.url },
    { kind: 'text', label: 'Agentur', value: project.agency },
    { kind: 'text', label: 'Ansprechpartner', value: project.contact_name },
    { kind: 'text', label: 'Stadt', value: project.city },
    { kind: 'text', label: 'Land', value: project.country },
    { kind: 'text', label: 'Remote', value: project.remote_percent != null ? `${project.remote_percent} %` : null, warn: isLowRemote(project.remote_percent) },
    { kind: 'badges', label: 'Suchbegriff', values: project.search_term_name ? [project.search_term_name] : [] },
    {
      kind: 'text',
      label: 'Endkunde',
      value: project.endcustomer === true ? '✓ Direktvergabe' : project.endcustomer === false ? '✗ Vermittler' : '–',
    },
    { kind: 'text', label: 'Vertragstyp', value: formatContractType(project.contract_type), warn: isRedContractType(project.contract_type) },
    { kind: 'text', label: 'Dauer', value: formatDuration(project.duration != null ? String(project.duration) : null) },
    { kind: 'text', label: 'Start', value: formatStartDate(project.start_date) },
    { kind: 'text', label: 'Eingestellt am', value: fmtDate(project.posted_at), warn: isOlderThan30Days(project.posted_at) },
    { kind: 'text', label: 'Gescrapt am', value: fmtDate(project.scraped_at) },
    { kind: 'text', label: 'Gemappt', value: project.mapped_at ? `✓ ${fmtDate(project.mapped_at)}` : 'ausstehend', chipVariant: project.mapped_at ? 'success' : 'muted' },
  ];
}

/** Builds the detail field array for a normalised project. */
export function buildProjectFields(project: Project): FieldEntry[] {
  return [
    { kind: 'text', label: 'ID (intern)', value: String(project.id) },
    { kind: 'text', label: 'URL', value: project.url },
    { kind: 'text', label: 'Stadt', value: project.city },
    { kind: 'text', label: 'Land', value: project.country },
    { kind: 'text', label: 'Remote', value: project.remote_percent != null ? `${project.remote_percent} %` : null, warn: isLowRemote(project.remote_percent) },
    { kind: 'badges', label: 'Suchbegriff', values: project.search_term ? [project.search_term] : [] },
    {
      kind: 'text',
      label: 'Endkunde',
      value: project.endcustomer === true ? '✓ Direktvergabe' : project.endcustomer === false ? '✗ Vermittler' : '–',
    },
    { kind: 'text', label: 'Branche', value: project.industry ?? '–' },
    { kind: 'text', label: 'Vertragstyp', value: formatContractType(project.contract_type), warn: isRedContractType(project.contract_type) },
    { kind: 'text', label: 'Dauer', value: formatDuration(project.duration) },
    { kind: 'text', label: 'Start', value: formatStartDate(project.start_date) },
    { kind: 'text', label: 'Eingestellt am', value: project.posted_at ? fmtDate(project.posted_at) : null, warn: isOlderThan30Days(project.posted_at) },
    { kind: 'text', label: 'Gescrapt am', value: project.scraped_at ? fmtDate(project.scraped_at) : null },
  ];
}

/** Formats an ISO date to a German short date (dd.MM.yyyy); missing → empty string. */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
