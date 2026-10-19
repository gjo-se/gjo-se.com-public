/**
 * useSubmissionScores – lädt die Score-Historie eines Bewerbungs-Vorgangs und
 * startet neue Score-Läufe.
 *
 * Die Historie läuft über `useClientSideTable` (vollständige Liste, Filter/Sort
 * im Speicher). `trigger` startet einen neuen Lauf über die Score-Admin-API und
 * lädt die Tabelle danach neu; Fehler landen als persistenter Toast, ein 422
 * wird um den Hinweis auf den Skill-/Override-Weg ergänzt.
 */
import { useCallback, useState } from 'react';

import {
  useClientSideTable,
  type UseClientSideTableReturn,
} from '@src/components/table/useClientSideTable';
import { extractApiError } from '@src/lib/api/extractError';
import { showErrorToast } from '@src/lib/errorToast';

import {
  fetchScoreHistory,
  startScoreRun,
  type ApplicationScoreRunOut,
} from '../services/applicationScoreService';

export interface UseSubmissionScoresResult
  extends UseClientSideTableReturn<ApplicationScoreRunOut> {
  /** Ob aktuell ein Score-Lauf läuft (Button-Spinner). */
  scoring: boolean;
  /** Startet einen neuen Score-Lauf und lädt die Historie neu. */
  trigger: () => Promise<void>;
}

/** Liefert den sortierbaren String-Wert eines Runs für das gegebene Feld. */
function scoreSortValue(run: ApplicationScoreRunOut, field: string): string {
  switch (field) {
    case 'totalScore':
      return String(run.totalScore ?? '');
    case 'verdict':
      return run.verdict ?? '';
    case 'assessed_weight':
      return String(run.assessed_weight);
    default:
      return run.createdAt;
  }
}

/**
 * Hook der die Score-Historie des Vorgangs `submissionId` lädt sowie einen
 * neuen Score-Lauf starten kann.
 */
export function useSubmissionScores(
  submissionId: number,
): UseSubmissionScoresResult {
  const [scoring, setScoring] = useState(false);

  const loadFn = useCallback(
    () => fetchScoreHistory(submissionId),
    [submissionId],
  );

  const table = useClientSideTable<ApplicationScoreRunOut>({
    tableKey: `application-score-${submissionId}`,
    loadFn,
    filterFn: (rows, q) => {
      const needle = q.trim().toLowerCase();
      if (!needle) return rows;
      return rows.filter((run) =>
        `${run.verdict ?? ''} ${run.createdAt}`.toLowerCase().includes(needle),
      );
    },
    sortFn: (rows, field, order) => {
      const sorted = [...rows].sort((a, b) =>
        scoreSortValue(a, field).localeCompare(scoreSortValue(b, field)),
      );
      return order === 'desc' ? sorted.reverse() : sorted;
    },
    defaultSort: 'createdAt',
    defaultOrder: 'desc',
    autoLoad: submissionId > 0,
  });

  const { reload } = table;

  const trigger = useCallback(async () => {
    setScoring(true);
    try {
      await startScoreRun({ submission_id: submissionId });
      await reload();
    } catch (err: unknown) {
      const message = extractApiError(err);
      if (/^422/.test(message)) {
        showErrorToast(
          `${message} – Keine Ausschreibung: Score über den Skill mit \`description_override\` starten.`,
        );
      } else {
        showErrorToast(message);
      }
    } finally {
      setScoring(false);
    }
  }, [submissionId, reload]);

  return { ...table, scoring, trigger };
}
