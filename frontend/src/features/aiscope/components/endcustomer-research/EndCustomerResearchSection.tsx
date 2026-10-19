import { cva } from 'class-variance-authority';
import { useCallback, useEffect, useState } from 'react';

import StatusCell from '@src/components/atoms/StatusCell/StatusCell';
import Button from '@src/components/primitives/Button';
import Dialog, {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';
import Icon from '@src/components/primitives/Icon';
import Link from '@src/components/primitives/Link';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';
import Tooltip, { TooltipContent, TooltipTrigger } from '@src/components/primitives/Tooltip';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from '@src/components/table';
import type { EndcustomerCandidate } from '@src/lib/api/aiscopeEndcustomer';

import { useEndcustomerResearch } from '../../hooks/useEndcustomerResearch';


// ── Tokens ────────────────────────────────────────────────────────────────

const HEADER_STRIP =
  'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 flex items-center justify-between';

const noResultsVariants = cva('border-t px-4 py-8 text-center');

const reasoningVariants = cva('max-w-xs whitespace-pre-wrap');

const DASH = '\u2013';

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  projectId: number;
  endcustomerIsSet: boolean;
  endcustomerResearchedAt: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Kombinierter Score aus Similarity (Vektor) + Confidence (LLM). */
function combinedScore(c: EndcustomerCandidate): number | null {
  if (c.similarity_to_project == null && c.confidence == null) return null;
  if (c.similarity_to_project == null) return c.confidence;
  if (c.confidence == null) return c.similarity_to_project;
  return (c.similarity_to_project + c.confidence) / 2;
}

/**
 * Endcustomer-Kandidaten-Tabelle mit Recherche-Trigger.
 *
 * Exakt dem AIScope Project Table Stil folgend:
 * plain text cells, ghost icon actions, header strip mit uppercase label.
 */
export default function EndCustomerResearchSection({
  projectId,
  endcustomerIsSet,
  endcustomerResearchedAt,
}: Props) {
  const {
    candidates, loading, progress,
    handleResearch, handleConfirm, handleReject, loadCandidates,
  } = useEndcustomerResearch(projectId, endcustomerIsSet);

  const [confirmTarget, setConfirmTarget] = useState<EndcustomerCandidate | null>(null);

  useEffect(() => {
    if (endcustomerResearchedAt && !endcustomerIsSet) {
      void loadCandidates();
    }
  }, [endcustomerResearchedAt, endcustomerIsSet, loadCandidates]);

  const onResearch = useCallback(() => { void handleResearch(); }, [handleResearch]);
  const onReject = useCallback((id: number) => { void handleReject(id); }, [handleReject]);
  const onConfirmOpen = useCallback((c: EndcustomerCandidate) => { setConfirmTarget(c); }, []);
  const onConfirmClose = useCallback(() => { setConfirmTarget(null); }, []);
  const onConfirm = useCallback(() => {
    if (confirmTarget) { void handleConfirm(confirmTarget.id); setConfirmTarget(null); }
  }, [confirmTarget, handleConfirm]);

  if (endcustomerIsSet && candidates.length === 0) return null;

  const isResearching = progress.total > 0 && progress.done < progress.total;
  const isDone = progress.total > 0 && progress.done === progress.total;

  const score = combinedScore;

  return (
    <section className="mt-8">
      {/* ── Header Strip ──────────────────────────────────────────────────── */}
      <div className={HEADER_STRIP}>
        <Text as="label" size="xs" weight="medium" uppercase color="muted">
          Endkunden-Recherche
        </Text>
        <Button
          onClick={onResearch}
          disabled={isResearching}
          loading={isResearching}
          size="sm"
        >
          Recherche starten
        </Button>
      </div>

      {/* ── Loading ────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {/* ── No results ─────────────────────────────────────────────────────── */}
      {!loading && isDone && candidates.length === 0 && (
        <div className={noResultsVariants()}>
          <Text variant="body" color="muted">
            Keine Endkunden-Kandidaten gefunden.
          </Text>
          <div className="mt-2">
            <Link href="https://www.google.com/search?q=endkunde%20karriere" external variant="muted" size="sm">
              Manuelle Web-Suche
            </Link>
          </div>
        </div>
      )}

      {/* ── Candidate Table ────────────────────────────────────────────────── */}
      {candidates.length > 0 && (
        <TableRoot>
          <TableHeader>
            <TableRow>
              <TableHead>Firma</TableHead>
              <TableHead>Karriere-Seite</TableHead>
              <TableHead>Quelle</TableHead>
              <TableHead alignment="center">Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate) => {
              const s = score(candidate);
              return (
                <TableRow key={candidate.id}>
                  {/* Firma */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Text lineClamp={1}>{candidate.company_name}</Text>
                      {candidate.reasoning && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Icon name="info" size="xs" variant="muted" />
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start">
                            <div className={reasoningVariants()}>
                              <Text variant="caption">
                                {candidate.reasoning}
                              </Text>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>

                  {/* Karriere-Seite (career_page_url) */}
                  <TableCell>
                    {candidate.career_page_url ? (
                      <Link href={candidate.career_page_url} external variant="muted" size="sm">
                        {shortUrl(candidate.career_page_url)}
                      </Link>
                    ) : (
                      <Text variant="body" color="muted">{DASH}</Text>
                    )}
                  </TableCell>

                  {/* Quelle */}
                  <TableCell>
                    <Text variant="body" color="muted">{candidate.source}</Text>
                  </TableCell>

                  {/* Score (kombiniert) */}
                  <TableCell alignment="center">
                    <Text variant="body">
                      {s != null ? pct(s) : DASH}
                    </Text>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusCell
                      statusableType="project_endcustomer_candidate"
                      statusableId={candidate.id}
                      currentStatus={candidate.status}
                      currentColor={candidate.status_color_token}
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell alignment="center">
                    <div className="flex items-center justify-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onReject(candidate.id)}
                        title="Verwerfen"
                        aria-label="Verwerfen"
                      >
                        <Icon name="x-circle" size="xs" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onConfirmOpen(candidate)}
                        title="Bestätigen"
                        aria-label="Bestätigen"
                      >
                        <Icon name="check-circle" size="xs" variant="green" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </TableRoot>
      )}

      {/* ── Confirm dialog ─────────────────────────────────────────────────── */}
      <Dialog open={confirmTarget !== null} onOpenChange={(open) => { if (!open) onConfirmClose(); }}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Endkunde bestätigen</DialogTitle>
            <DialogDescription>
              {confirmTarget?.company_name && (
                <>
                  Bist du sicher, dass{' '}
                  <Text as="span" variant="body" weight="bold">
                    {confirmTarget.company_name}
                  </Text>
                  {' '}der Endkunde für dieses Projekt ist?{'\n'}
                  Die CRM-Anlage wird automatisch ausgelöst.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Abbrechen</Button>
            </DialogClose>
            <Button onClick={onConfirm}>Bestätigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

// ── Component ──────────────────────────────────────────────────────────────

/** Kürzt eine URL für die Anzeige. */
function shortUrl(raw: string): string {
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
