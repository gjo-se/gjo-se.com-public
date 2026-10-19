/**
 * ProjectComparisonTable – Side-by-side comparison of the canonical project
 * and its linked Freelancermap entries.
 *
 * Renders metadata rows, a Verknüpfung row with Comboboxes for reassigning
 * slave entries, an Aktionen row, and description tabs below. The row
 * definitions, cells, skills section and description tabs live in sibling
 * modules; this file is the orchestration root.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import ProjectEnrichDialog from '@src/components/molecules/ProjectEnrichDialog/ProjectEnrichDialog';
import Button from '@src/components/primitives/Button';
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@src/components/primitives/Dialog';
import Separator from '@src/components/primitives/Separator';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';
import {
  TableBody,
  TableCell,
  TableRoot,
  TableRow,
} from '@src/components/table';
import { estimateProjectHourlyRate, setProjectCanonical } from '@src/lib/api/aiscope';
import type { ComparisonColumn } from '@src/lib/api/aiscopeTypes';
import { fetchPromotedStatus, unpromoteFromDataset } from '@src/lib/api/callLog';
import { usePromoteToDataset } from '@src/providers/datasetPromotion/usePromoteToDataset';
import { useProjectEnrichmentStatus } from '@src/providers/projectEnrichment/useProjectEnrichmentStatus';

import ErrorState from '../../molecules/ErrorState/ErrorState';
import { containerCls, headerStripCls } from '../ProjectDetailView/ProjectDetailView.constants';

import ProjectComparisonActionsCell from './ProjectComparisonActionsCell';
import ProjectComparisonDescriptionTabs from './ProjectComparisonDescriptionTabs';
import ProjectComparisonLinkCell from './ProjectComparisonLinkCell';
import ProjectComparisonSkillsSection from './ProjectComparisonSkillsSection';
import { PCT_STYLES, stickyLabel } from './ProjectComparisonTable.constants';
import { colStyle } from './ProjectComparisonTable.utils';
import ProjectNotesSection from './ProjectNotesSection';
import { useProjectComparisonColumnWidths } from './useProjectComparisonColumnWidths';
import useProjectComparisonRows from './useProjectComparisonRows';

import type { ProjectComparisonTableProps } from './ProjectComparisonTable.types';

/** Side-by-side comparison of the canonical project and its linked entries. */
export type { ProjectComparisonTableVariants } from './ProjectComparisonTable.variants';

export default function ProjectComparisonTable({
  columns,
  loading = false,
  error = null,
  onRefetch,
  canonicalProjectId,
  status = null,
  statusColor = null,
  mergedDescription = null,
  mergeDirty = false,
  merging = false,
  streamingText = null,
  callLogMeta: _callLogMeta = null,
  onMerge,
  onScoreChange,
  notes = null,
}: ProjectComparisonTableProps) {
  const [unlinkTarget, setUnlinkTarget] = useState<{ projectId: number; label: string } | null>(null);
  const metaRef = useRef<HTMLDivElement | null>(null);
  const colWidths = useProjectComparisonColumnWidths(columns, metaRef);
  const persistCallLogId = columns.find(c => c.canonical)?.callLogId ?? null;
  const { promote, isPromoting } = usePromoteToDataset();
  const {
    enriched, linkId, companyId, companyName, personId, personName,
    refetch: refetchEnrichment,
  } = useProjectEnrichmentStatus(canonicalProjectId);
  const rows = useProjectComparisonRows({ linkId, companyId, companyName, personId, personName }, onRefetch);
  const [promotedTo, setPromotedTo] = useState<'golden' | 'failure' | null>(null);
  const [enrichTarget, setEnrichTarget] = useState<{
    projectId: number;
    companyName: string;
    contactName: string;
  } | null>(null);
  const [estimatingRate, setEstimatingRate] = useState(false);

  useEffect(() => {
    if (persistCallLogId == null) return;
    let cancelled = false;
    fetchPromotedStatus(persistCallLogId)
      .then((res) => { if (!cancelled) setPromotedTo(res.promoted_to ?? null); })
      .catch(() => {}); // fail silently, keep empty state
    return () => { cancelled = true; };
  }, [persistCallLogId]);

  const handlePromoteToggle = useCallback((label: 'golden' | 'failure') => {
    if (persistCallLogId == null) return;
    if (promotedTo === label) {
      unpromoteFromDataset(persistCallLogId)
        .then((res) => {
          if (res.status === 'created') { setPromotedTo(null); toast.success('Aus Dataset entfernt'); }
          else { toast.error(res.message || 'Fehler'); }
        })
        .catch(() => toast.error('Netzwerkfehler'));
    } else {
      promote(persistCallLogId, label).then(() => setPromotedTo(label));
    }
  }, [persistCallLogId, promote, promotedTo]);

  function handleUnlink() {
    if (!unlinkTarget) return;
    const { projectId } = unlinkTarget;
    setUnlinkTarget(null);
    setProjectCanonical(projectId, null)
      .then(() => { toast.success('Vom Master getrennt.'); onRefetch(); })
      .catch((err: Error) => toast.error(err?.message ?? 'Fehler beim Trennen.'));
  }

  async function handleEstimateRate(projectId: number) {
    setEstimatingRate(true);
    try {
      const res = await estimateProjectHourlyRate(projectId);
      toast.success(`Stundensatz geschätzt: ${res.hourly_rate} €/h (Ziel ${res.target_rate} €/h).`);
      onRefetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Schätzung fehlgeschlagen.');
    } finally {
      setEstimatingRate(false);
    }
  }

  function handleEnrich(col: ComparisonColumn) {
    setEnrichTarget({
      projectId: col.id,
      companyName: col.agency === '\u2013' ? '' : col.agency,
      contactName: col.contactName === '\u2013' ? '' : col.contactName,
    });
  }

  function handleUnlinkRequest(col: ComparisonColumn) {
    setUnlinkTarget({ projectId: col.id, label: `Projekt #${col.id} vom Master trennen?` });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <ErrorState code="500" title="Ladefehler" description={error} />;
  }

  if (columns.length === 0) return null;

  const master = columns.find((col) => col.canonical);

  return (
    <>
      <style>{PCT_STYLES}</style>
      <Separator spacing="my-6" />
      <section className="pct-wrapper">
        <div className={containerCls} ref={metaRef}>
          <div className={headerStripCls}>
            <Text as="span" size="xs" weight="medium" uppercase color="muted">
              Metadaten ({columns.length} Projekt{columns.length !== 1 ? 'e' : ''})
            </Text>
          </div>
          <TableRoot>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell style={stickyLabel}>
                    <Text as="span" size="xs" weight="medium" uppercase color="muted">
                      {row.label}
                    </Text>
                  </TableCell>
                  {columns.map((col, i) => (
                    <TableCell key={col.id} style={colStyle(col, i)}>
                      {row.render(col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}

              {/* Verknüpfung row – Combobox for slave columns */}
              <TableRow>
                <TableCell style={stickyLabel}>
                  <Text as="span" size="xs" weight="medium" uppercase color="muted">
                    Verknüpfung
                  </Text>
                </TableCell>
                {columns.map((col, i) => (
                  <TableCell key={col.id} style={colStyle(col, i)}>
                    <ProjectComparisonLinkCell
                      col={col}
                      canonicalProjectId={canonicalProjectId}
                      onRefetch={onRefetch}
                    />
                  </TableCell>
                ))}
              </TableRow>

              {/* Aktionen row – link, toggles, unlink, promote */}
              <TableRow>
                <TableCell style={stickyLabel}>
                  <Text as="span" size="xs" weight="medium" uppercase color="muted">
                    Aktionen
                  </Text>
                </TableCell>
                {columns.map((col, i) => (
                  <TableCell key={col.id} style={colStyle(col, i)}>
                    <ProjectComparisonActionsCell
                      col={col}
                      canonicalProjectId={canonicalProjectId}
                      status={status}
                      statusColor={statusColor}
                      promotedTo={promotedTo}
                      isPromoting={isPromoting}
                      persistCallLogId={persistCallLogId}
                      enriched={enriched}
                      estimatingRate={estimatingRate}
                      onPromoteToggle={handlePromoteToggle}
                      onEnrich={handleEnrich}
                      onEstimateRate={handleEstimateRate}
                      onUnlink={handleUnlinkRequest}
                    />
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </TableRoot>
        </div>
      </section>

      {master && master.skills.length > 0 && (
        <ProjectComparisonSkillsSection
          master={master}
          canonicalProjectId={canonicalProjectId}
          onRefetch={onRefetch}
          onScoreChange={onScoreChange}
        />
      )}

      <Dialog open={unlinkTarget !== null} onOpenChange={(open) => { if (!open) setUnlinkTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sicherheitsabfrage</DialogTitle></DialogHeader>
          <DialogDescription>{unlinkTarget?.label}</DialogDescription>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setUnlinkTarget(null)}>Abbrechen</Button>
            <Button variant="destructive" size="sm" onClick={handleUnlink}>Bestätigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {enrichTarget && (
        <ProjectEnrichDialog
          open={enrichTarget !== null}
          onOpenChange={(open) => { if (!open) setEnrichTarget(null); }}
          projectId={enrichTarget.projectId}
          companyName={enrichTarget.companyName}
          contactName={enrichTarget.contactName}
          onEnriched={refetchEnrichment}
        />
      )}

      {/* Description tabs – widths measured from metadata table via ResizeObserver */}
      <ProjectComparisonDescriptionTabs
        columns={columns}
        colWidths={colWidths}
        mergeDirty={mergeDirty}
        merging={merging}
        mergedDescription={mergedDescription}
        streamingText={streamingText}
        onMerge={onMerge}
      />

      <ProjectNotesSection
        projectId={canonicalProjectId ?? columns.find((c) => c.canonical)?.id ?? 0}
        notes={notes}
        onRefetch={onRefetch}
      />
    </>
  );
}
