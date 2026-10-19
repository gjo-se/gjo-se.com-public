/**
 * Builds the metadata row definitions for the ProjectComparisonTable
 * (label + per-column renderer).
 */
import Chip from '@src/components/primitives/Chip';
import Text from '@src/components/primitives/Text';
import { setProjectHourlyRate, setProjectMyHourlyRate } from '@src/lib/api/aiscope';
import type { ComparisonColumn } from '@src/lib/api/aiscopeTypes';

import CompanyContactCell from './CompanyContactCell';
import ContactPersonCell from './ContactPersonCell';
import MailTitleCell from './MailTitleCell';
import MyStartDateCell from './MyStartDateCell';
import RateEditCell from './RateEditCell';

import type { CrmLinks, RowDef } from './ProjectComparisonTable.types';

/** Returns the metadata row definitions for the given CRM links. */
export default function useProjectComparisonRows(crm: CrmLinks, onRefetch: () => void): RowDef[] {
  /** Builds a canonical-only inline-edit row for an hourly rate (EUR/h). */
  const rateRow = (
    label: string,
    pick: (col: ComparisonColumn) => number | null,
    save: (id: number, value: number | null) => Promise<unknown>,
  ): RowDef => ({
    label,
    render: (col) =>
      col.canonical ? (
        <RateEditCell value={pick(col)} save={(value) => save(col.id, value)} onRefetch={onRefetch} />
      ) : (
        <Text as="span" size="sm" color="muted">–</Text>
      ),
  });

  return [
    {
      label: 'ID (intern)',
      render: (col) => (
        <Text as="span" size="sm" weight="medium" color={col.canonical ? undefined : 'muted'}>
          {col.canonical ? `${col.id} (kanonisch)` : col.id}
        </Text>
      ),
    },
    {
      label: 'Endkunde',
      render: (col) => (
        <Text as="span" size="sm">{col.endcustomer}</Text>
      ),
    },
    rateRow('€/h', (col) => col.hourlyRate, setProjectHourlyRate),
    rateRow('my €/h', (col) => col.myHourlyRate, setProjectMyHourlyRate),
    {
      label: 'Branche',
      render: (col) => (
        <Text as="span" size="sm">{col.industry ?? '–'}</Text>
      ),
    },
    {
      label: 'Score',
      render: (col) =>
        col.scoreChip ? (
          <Chip variant="success" size="sm">{col.scoreLabel}</Chip>
        ) : (
          <Text as="span" size="sm">{col.scoreLabel}</Text>
        ),
    },
    {
      label: 'Title',
      render: (col) => (
        <Text as="span" size="sm" title={col.title} lineClamp={1}>{col.title}</Text>
      ),
    },
    {
      label: 'Titel (Mail)',
      render: (col) =>
        col.canonical ? (
          <MailTitleCell
            projectId={col.id}
            value={col.titleNormalized}
            fallback={col.title}
            onRefetch={onRefetch}
          />
        ) : (
          <Text as="span" size="sm" color="muted">–</Text>
        ),
    },
    {
      label: 'Stadt',
      render: (col) => <Text as="span" size="sm" color={col.city ? undefined : 'muted'}>{col.city ?? '–'}</Text>,
    },
    {
      label: 'Land',
      render: (col) => <Text as="span" size="sm" color={col.country ? undefined : 'muted'}>{col.country ?? '–'}</Text>,
    },
    {
      label: 'Dauer',
      render: (col) => <Text as="span" size="sm">{col.duration}</Text>,
    },
    {
      label: 'Start',
      render: (col) =>
        col.canonical ? (
          <MyStartDateCell
            projectId={col.id}
            value={col.myStartDate}
            fallback={col.start}
            onRefetch={onRefetch}
          />
        ) : (
          <Text as="span" size="sm">{col.start}</Text>
        ),
    },
    {
      label: 'Remote',
      render: (col) => <Text as="span" size="sm" color={col.remoteWarn ? 'error' : undefined}>{col.remote}</Text>,
    },
    {
      label: 'Job Role',
      render: (col) => <Text as="span" size="sm">{col.jobRole}</Text>,
    },
    {
      label: 'Vertragstyp',
      render: (col) => <Text as="span" size="sm" color={col.contractWarn ? 'error' : undefined}>{col.contractType}</Text>,
    },
    {
      label: 'Eingestellt am',
      render: (col) => <Text as="span" size="sm" color={col.postedAtWarn ? 'error' : undefined}>{col.postedAt}</Text>,
    },
    {
      label: 'Agentur',
      render: (col) =>
        col.canonical ? (
          <CompanyContactCell
            personId={crm.personId}
            companyId={crm.companyId}
            companyName={crm.companyName}
            fallbackName={col.agency}
            onRefetch={onRefetch}
          />
        ) : (
          <Text as="span" size="sm">{col.agency}</Text>
        ),
    },
    {
      label: 'Kontakt',
      render: (col) =>
        col.canonical ? (
          <ContactPersonCell
            projectId={col.id}
            linkId={crm.linkId}
            personId={crm.personId}
            personName={crm.personName}
            fallbackName={col.contactName}
            onRefetch={onRefetch}
          />
        ) : (
          <Text as="span" size="sm">{col.contactName}</Text>
        ),
    },
  ];
}
