/**
 * Content of a single column's Aktionen cell (raw link, status, promote,
 * enrich, estimate, unlink).
 */
import StatusCell from '@src/components/atoms/StatusCell/StatusCell';
import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon';
import Link from '@src/components/primitives/Link';
import type { ComparisonColumn, ProjectStatus } from '@src/lib/api/aiscopeTypes';

/** Props of a single Aktionen cell. */
export interface ProjectComparisonActionsCellProps {
  col: ComparisonColumn;
  canonicalProjectId?: number;
  status?: ProjectStatus | null;
  statusColor?: string | null;
  promotedTo: 'golden' | 'failure' | null;
  isPromoting: boolean;
  persistCallLogId: number | null;
  enriched: boolean;
  estimatingRate: boolean;
  onPromoteToggle: (label: 'golden' | 'failure') => void;
  onEnrich: (col: ComparisonColumn) => void;
  onEstimateRate: (projectId: number) => void;
  onUnlink: (col: ComparisonColumn) => void;
}

/** Renders the action buttons for one comparison column. */
export default function ProjectComparisonActionsCell({
  col,
  canonicalProjectId,
  status,
  statusColor,
  promotedTo,
  isPromoting,
  persistCallLogId,
  enriched,
  estimatingRate,
  onPromoteToggle,
  onEnrich,
  onEstimateRate,
  onUnlink,
}: ProjectComparisonActionsCellProps) {
  return (
    <div className="flex gap-2">
      {col.freelancermapUrl && (
        <Link
          to={col.freelancermapUrl}
          variant="ghost"
          title="Rohdaten anzeigen"
          aria-label="Rohdaten anzeigen"
        >
          <Icon name="external-link" size="xs" />
        </Link>
      )}
      {col.canonical && canonicalProjectId != null && (
        <StatusCell
          statusableType="project"
          statusableId={canonicalProjectId}
          currentStatus={status ?? undefined}
          currentColor={statusColor ?? undefined}
        />
      )}
      {col.canonical && (
        <>
          <div
            className="inline-flex"
            title={promotedTo === 'golden' ? 'Aus Golden-Dataset entfernen' : (persistCallLogId == null ? 'Als Golden speichern (kein Merge-Call-Log vorhanden)' : 'Als Golden speichern')}
          >
            <Button
              variant="ghost"
              size="xs"
              disabled={isPromoting || persistCallLogId == null}
              aria-label={promotedTo === 'golden' ? 'Aus Golden-Dataset entfernen' : 'Als Golden speichern'}
              onClick={() => { void onPromoteToggle('golden'); }}
            >
              <Icon name="shield-check" size="xs" filled={promotedTo === 'golden'} variant={promotedTo === 'golden' ? 'green' : 'muted'} />
            </Button>
          </div>
          <div
            className="inline-flex"
            title={promotedTo === 'failure' ? 'Aus Failure-Dataset entfernen' : (persistCallLogId == null ? 'Als Fehlerfall speichern (kein Merge-Call-Log vorhanden)' : 'Als Fehlerfall speichern')}
          >
            <Button
              variant="ghost"
              size="xs"
              disabled={isPromoting || persistCallLogId == null}
              aria-label={promotedTo === 'failure' ? 'Aus Failure-Dataset entfernen' : 'Als Fehlerfall speichern'}
              onClick={() => { void onPromoteToggle('failure'); }}
            >
              <Icon name="x-circle" size="xs" filled={promotedTo === 'failure'} variant={promotedTo === 'failure' ? 'red' : 'muted'} />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="xs"
            disabled={enriched}
            title={enriched ? 'Kontaktdaten bereits angereichert' : 'Kontaktdaten besorgen'}
            aria-label={enriched ? 'Kontaktdaten bereits angereichert' : 'Kontaktdaten besorgen'}
            onClick={() => onEnrich(col)}
          >
            <Icon name="users" size="xs" variant={enriched ? 'green' : 'muted'} />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            disabled={estimatingRate}
            title="Stundensatz schätzen (regelbasiert)"
            aria-label="Stundensatz schätzen (regelbasiert)"
            onClick={() => { onEstimateRate(col.id); }}
          >
            <Icon name="calculator" size="xs" variant="muted" />
          </Button>
        </>
      )}
      {!col.canonical && (
        <Button
          variant="ghost"
          size="xs"
          title="Vom Master trennen"
          aria-label="Vom Master trennen"
          onClick={() => onUnlink(col)}
        >
          <Icon name="link-2-off" size="xs" />
        </Button>
      )}
    </div>
  );
}
