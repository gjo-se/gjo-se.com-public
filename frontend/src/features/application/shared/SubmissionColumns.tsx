/**
 * SubmissionColumns – Column definitions for the application submissions table.
 *
 * Columns: ID, Projekt (link to project detail), Firma (link to company detail),
 * Empfänger (link to person detail), Status, Score, Datum. Projekt/Firma/Empfänger/
 * Score/Datum are sortable server-side; Status renders a click-to-cycle StatusCell,
 * Score the latest run's total (or `–`) and Datum a formatted timestamp (newest first
 * by default).
 */

import StatusCell from '@src/components/atoms/StatusCell/StatusCell';
import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';
import type { TableColumnProps } from '@src/components/table';
import { formatDate } from '@src/lib/formatDate';
import { routeConfig } from '@src/router.config';

import type { ApplicationStatusOut } from '../services/applicationService';
import type { ReactNode } from 'react';

/** Column definitions: ID, Projekt, Firma, Empfänger, Status, Score, Datum. */
export function createSubmissionColumns(): Record<string, TableColumnProps> {
  return {
    projectId: {
      label: 'ID',
      width: '80px',
      alignment: 'left',
      search: true,
      sortable: false,
    },
    projectTitle: {
      label: 'Projekt',
      width: '280px',
      search: true,
      sortable: true,
      renderCell: renderProjectTitleCell,
    },
    recipientCompanyName: {
      label: 'Firma',
      search: true,
      sortable: true,
      renderCell: renderCompanyCell,
    },
    recipientDisplayName: {
      label: 'Empfänger',
      search: true,
      sortable: true,
      renderCell: renderRecipientCell,
    },
    status: {
      label: 'Status',
      sortable: false,
      renderCell: renderStatusCell,
    },
    lastScore: {
      label: 'Score',
      width: '140px',
      sortable: true,
      renderCell: renderScoreCell,
    },
    createdAt: {
      label: 'Datum',
      sortable: true,
      defaultSort: 'desc',
      renderCell: renderCreatedAtCell,
    },
  };
}

function renderCompanyCell(row: Record<string, unknown>): ReactNode {
  const name = row['recipientCompanyName'] as string | null | undefined;
  const companyId = row['recipientCompanyId'] as number | null | undefined;
  if (!name) return <Text size="sm" color="muted">{'\u2013'}</Text>;
  if (!companyId) return <Text size="sm">{name}</Text>;
  const detailPath = routeConfig.adminCrmCompanyDetail.path.replace(':id', String(companyId));
  return <Link to={detailPath}>{name}</Link>;
}

function renderCreatedAtCell(row: Record<string, unknown>): ReactNode {
  return <Text size="sm">{formatDate(String(row['createdAt'] ?? ''))}</Text>;
}

function renderProjectTitleCell(row: Record<string, unknown>): ReactNode {
  const projectId = row['projectId'] as number | undefined;
  // Prefer the curated mail title (project.title_normalized) – shorter, the
  // same value used as the mail subject. Falls back to the raw project title.
  const curated = row['projectTitleNormalized'] as string | null | undefined;
  const title = curated?.trim() ? curated : (row['projectTitle'] as string | null | undefined);
  if (!projectId) return <Text size="sm" color="muted">{'\u2013'}</Text>;
  const detailPath = routeConfig.adminAiscopeProjectDetail.path.replace(':id', String(projectId));
  return <Link to={detailPath}>{title ?? `Projekt ${projectId}`}</Link>;
}

function renderRecipientCell(row: Record<string, unknown>): ReactNode {
  const name = (row['recipientDisplayName'] as string | null | undefined) ?? null;
  const email = row['recipientEmail'] as string | undefined;
  const label = name ?? email ?? null;
  const personId = row['recipientPersonId'] as number | null | undefined;
  if (!label) return <Text size="sm" color="muted">{'\u2013'}</Text>;
  if (!personId) return <Text size="sm">{label}</Text>;
  const detailPath = routeConfig.adminCrmPersonDetail.path.replace(':id', String(personId));
  return <Link to={detailPath}>{label}</Link>;
}

function renderScoreCell(row: Record<string, unknown>): ReactNode {
  const score = row['lastScore'] as number | null | undefined;
  if (score == null) return <Text size="sm" color="muted">{'\u2013'}</Text>;
  return <Text size="sm" weight="medium">{score.toFixed(0)}</Text>;
}

function renderStatusCell(row: Record<string, unknown>): ReactNode {
  const status = row['status'] as ApplicationStatusOut | null | undefined;
  return (
    <StatusCell
      statusableType="application_submission"
      statusableId={row['id'] as number}
      currentStatus={status?.name}
      currentColor={status?.colorToken}
    />
  );
}
