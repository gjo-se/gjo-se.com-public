/**
 * ScoreHistory – Score-Sektion der Vorgangs-Detailseite.
 *
 * Zeigt die Run-Historie (Datum · 11 Kriterien · Coverage · Gesamt) mit Trigger-
 * Button „Score berechnen", einem Baseline-Leerzustand, dem Gewichte-Vorbehalt
 * und einem Klick-Dialog für die Kriterien-Aufschlüsselung.
 */
import { useMemo, useState } from 'react';

import Button from '@src/components/primitives/Button';
import Text from '@src/components/primitives/Text';
import Table from '@src/components/table';
import type { TableColumnProps } from '@src/components/table';
import { useTableActions } from '@src/components/table/useTableActions';
import { formatDate } from '@src/lib/formatDate';

import { useSubmissionScores } from '../../hooks/useSubmissionScores';
import {
  CRITERION_LABELS,
  CRITERION_ORDER,
  CRITERION_SHORT_LABELS,
} from '../../shared/applicationScoreLabels';

import ScoreCriterionDialog from './ScoreCriterionDialog';

import type {
  ApplicationScoreCriterionOut,
  ApplicationScoreRunOut,
} from '../../services/applicationScoreService';

export interface ScoreHistoryProps {
  /** Vorgangs-ID, deren Score-Historie angezeigt wird. */
  submissionId: number;
}

/** Spalten der Run-Tabelle: Datum, 11 Kriterien, Coverage, Gesamt. */
function createScoreColumns(): Record<string, TableColumnProps> {
  const columns: Record<string, TableColumnProps> = {
    createdAt: {
      label: 'Datum',
      search: true,
      sortable: true,
      renderCell: (row) => (
        <Text size="sm">{formatDate(String(row['createdAt'] ?? ''))}</Text>
      ),
    },
  };

  CRITERION_ORDER.forEach((key) => {
    columns[`criterion_${key}`] = {
      label: CRITERION_SHORT_LABELS[key] ?? key,
      headerTooltip: CRITERION_LABELS[key],
      alignment: 'right',
      sortable: false,
      renderCell: (row) => {
        const criteria = row['criteria'] as ApplicationScoreCriterionOut[] | undefined;
        const value = criteria?.find((c) => c.criterionKey === key)?.value;
        return (
          <Text size="sm" tabular>
            {value == null ? '\u2013' : Math.round(value * 100)}
          </Text>
        );
      },
    };
  });

  columns.assessed_weight = {
    label: 'Coverage',
    width: '100px',
    alignment: 'right',
    sortable: false,
    renderCell: (row) => {
      const weight = (row['assessed_weight'] as number | undefined) ?? 0;
      return (
        <Text size="sm" tabular>
          {weight}
        </Text>
      );
    },
  };

  columns.totalScore = {
    label: 'Gesamt',
    width: '100px',
    alignment: 'right',
    sortable: false,
    renderCell: (row) => {
      const value = row['totalScore'] as number | null | undefined;
      return (
        <Text size="sm" tabular>
          {value == null ? '\u2013' : value.toFixed(2)}
        </Text>
      );
    },
  };

  return columns;
}

/**
 * Sektion mit Trigger-Button, Run-Tabelle und Kriterien-Dialog.
 */
export default function ScoreHistory({ submissionId }: ScoreHistoryProps) {
  const { scoring, trigger, ...table } = useSubmissionScores(submissionId);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  // Derive from the live table so a reload (Reconcile nach Skill-Ausschluss)
  // aktualisiert den offenen Dialog automatisch.
  const selectedRun = table.allData.find((run) => run.id === selectedRunId) ?? null;

  const columns = useMemo(() => createScoreColumns(), []);

  const rowActions = useTableActions<ApplicationScoreRunOut>({
    customActions: [
      {
        key: 'score-details',
        icon: 'search',
        label: 'Details',
        onAction: async (row) => {
          setSelectedRunId(row.id);
        },
      },
    ],
  });

  const isEmpty = table.allData.length === 0;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <Text as="h2" variant="h2">
          Score
        </Text>
        <Button
          variant="outline"
          size="sm"
          loading={scoring}
          onClick={() => void trigger()}
        >
          Score berechnen
        </Button>
      </div>

      {isEmpty ? (
        <Text size="sm" color="muted">
          Noch kein Score – „Score berechnen“ startet den ersten Lauf
          (Baseline).
        </Text>
      ) : (
        <Table<ApplicationScoreRunOut>
          table={table}
          columns={columns}
          rowActions={rowActions}
        />
      )}

      <div className="mt-2">
        <Text as="p" size="xs" color="muted">
          Gewichte fix v1, Schwellen heuristisch, nicht kalibriert.
        </Text>
      </div>

      <ScoreCriterionDialog
        run={selectedRun}
        onOpenChange={(open) => !open && setSelectedRunId(null)}
        submissionId={submissionId}
        onReScore={() => void trigger()}
        onExcluded={() => void table.reload()}
      />
    </section>
  );
}
