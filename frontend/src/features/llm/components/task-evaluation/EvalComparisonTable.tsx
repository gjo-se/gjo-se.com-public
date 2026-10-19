import { useCallback, useMemo } from 'react';

import Icon from '@src/components/primitives/Icon';
import Text from '@src/components/primitives/Text';
import Table from '@src/components/table';
import type { TableColumnProps, TableStateProps } from '@src/components/table';
import type { GateResult, LlmEvalRun } from '@src/features/llm/services/evalRunService';

import { METRIC_LABEL, WINNER_BADGE, WINNER_CELL } from './constants';

import type { ReactNode } from 'react';


// ── Types ──────────────────────────────────────────────────────

/** One row in the comparison table. Keys are column identifiers. */
interface ComparisonRow {
  type: 'group' | 'metric';
  __groupKey?: string;
  __gateId: string;
  /** Unique row identifier (required by TanStack Table). */
  id: string;
  /** First column: the metric label or group name. */
  metric: ReactNode;
  /** model_config_id → cell value (ReactNode). */
  [modelCol: `model_${number}`]: ReactNode;
}

export interface EvalComparisonTableProps {
  /** All runs from the same trigger batch (one per candidate). */
  runs: LlmEvalRun[];
  /** model_config_id → display name for column headers. */
  modelLabels?: Record<number, string>;
}

// ── Metric definitions ────────────────────────────────────────

interface MetricDef {
  key: string;
  label: string;
  unit: string;
  lowerIsBetter: boolean;
  format?: (v: unknown) => string;
  /** Which detail field determines the "winner" for combined cells. */
  winnerKey?: string;
}

const GATE_LAYOUT: Record<string, { label: string; metrics: MetricDef[]; help?: string }> = {
  'contract_validation': {
    label: 'Contract Validation',
    help: 'Prüft, ob alle {placeholders} im Prompt-Template mit den definierten Platzhaltern der TASK_REGISTRY übereinstimmen.',
    metrics: [
      { key: '_contract_validation', label: 'Contract Validation', unit: '', lowerIsBetter: false },
    ],
  },
  'schema_validation': {
    label: 'Schema Validation',
    help: 'Validiert, ob sich die strukturierte LLM-Ausgabe gegen das output_schema parsen lässt. Macht einen echten LLM-Call mit Dummy-Variablen.',
    metrics: [
      { key: '_schema_validation', label: 'Schema Validation', unit: '', lowerIsBetter: false },
    ],
  },
  'client_latency': {
    label: 'Client Latency',
    help: 'Misst die Latenz-Differenz zwischen direkten LLM-Calls (ohne Client-Wrapper) und Client-vermittelten Calls. Bestanden wenn der Client max. 2× langsamer ist als der Direct-Call (overhead_ratio ≤ 2.0).',
    metrics: [
      { key: '_combined_client_latency', label: 'Direct / Client', unit: '', lowerIsBetter: true, winnerKey: 'avg_client_ms' },
    ],
  },
  'baseline_latency': {
    label: 'Baseline Latency',
    help: 'Vergleicht die Kandidaten-Latenz mit der 7-Tage-Production-P95-Baseline. Bestanden wenn der Kandidat ≤ Baseline × 1.1 ist. Nutzt Client-Timings aus Client Latency wieder.',
    metrics: [
      { key: '_combined_baseline_latency', label: 'Production / Client', unit: '', lowerIsBetter: true, winnerKey: 'candidate_avg_ms' },
    ],
  },
  'golden_regression': {
    label: 'Golden Regression',
    help: 'Vergleicht die Output-Qualität des Kandidaten gegen ein kuratiertes Golden Dataset via LLM-as-Judge (LangFuse Experiments). Bestanden wenn avg_score ≥ 0.7.',
    metrics: [
      { key: '_combined_golden_regression', label: 'Score / Count / Threshold', unit: '', lowerIsBetter: false, winnerKey: 'avg_score' },
    ],
  },
};

// ── Helpers ────────────────────────────────────────────────────

function findWinner(
  runs: LlmEvalRun[],
  gateId: string,
  metricKey: string,
  lowerIsBetter: boolean,
): number | null {
  let bestId: number | null = null;
  let bestVal: number | null = null;
  runs.forEach((r) => {
    if (r.model_config_id === null) return;
    const g = (r.gate_results ?? []).find(gr => gr.gate === gateId);
    if (!g) return;
    const v = parseNum(g.details[metricKey]);
    if (v === null) return;
    if (bestVal === null || (lowerIsBetter ? v < bestVal : v > bestVal)) {
      bestVal = v;
      bestId = r.model_config_id;
    }
  });
  return bestId;
}

function fmt(val: unknown, unit: string, def?: MetricDef): string {
  if (val === null || val === undefined) return '–';
  if (def?.format) return def.format(val) + (unit ? ` ${unit}` : '');
  const n = Number(val);
  if (!Number.isNaN(n)) {
    const s = n % 1 === 0 ? n.toString() : n.toFixed(1);
    return unit ? `${s} ${unit}` : s;
  }
  return String(val) + (unit ? ` ${unit}` : '');
}

function parseNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

/** Build the combined Gate 1c cell: "direct / client / ratio" with green on ratio ≤ 1.
 *  Values in seconds (German comma decimal).  Subtle green background when winner. */
function renderGate1cCombined(gate: GateResult | undefined, isWinner: boolean): ReactNode {
  if (!gate) return '–';
  const direct = parseNum(gate.details['avg_direct_ms']);
  const client = parseNum(gate.details['avg_client_ms']);
  const ratio = parseNum(gate.details['overhead_ratio']);
  if (direct === null || client === null || ratio === null) return '–';

  const directSec = (direct / 1000).toFixed(1).replace('.', ',');
  const clientSec = (client / 1000).toFixed(1).replace('.', ',');
  const ratioStr = ratio.toFixed(2).replace('.', ',');
  const isGreen = ratio <= 1.0;

  const inner = (
    <Text as="span" size="xs" align="center">
      {`${directSec} / `}
      <Text as="span" color={isGreen ? 'success' : undefined} weight={isGreen ? 'medium' : undefined}>
        {clientSec}
      </Text>
      {' / '}
      <Text as="span" color={isGreen ? 'success' : undefined} weight={isGreen ? 'medium' : undefined}>
        {ratioStr}
      </Text>
    </Text>
  );

  if (isWinner) {
    return (
      <div className={WINNER_CELL}>
        {inner}
      </div>
    );
  }
  return inner;
}

/** Build the combined Gate 1d cell: "production / candidate / ratio" with green on ratio ≤ 1.
 *  Values in seconds (German comma decimal).  Full cell background when winner. */
function renderGate1dCombined(gate: GateResult | undefined, isWinner: boolean): ReactNode {
  if (!gate) return '–';
  const baseline = parseNum(gate.details['baseline_p95_ms']);
  const candidate = parseNum(gate.details['candidate_avg_ms']);
  const ratio = parseNum(gate.details['ratio']);
  if (baseline === null || candidate === null || ratio === null) return '–';

  const baselineSec = (baseline / 1000).toFixed(1).replace('.', ',');
  const candidateSec = (candidate / 1000).toFixed(1).replace('.', ',');
  const ratioStr = ratio.toFixed(2).replace('.', ',');
  const isGreen = ratio <= 1.0;

  const inner = (
    <Text as="span" size="xs" align="center">
      {`${baselineSec} / `}
      <Text as="span" color={isGreen ? 'success' : undefined} weight={isGreen ? 'medium' : undefined}>
        {candidateSec}
      </Text>
      {' / '}
      <Text as="span" color={isGreen ? 'success' : undefined} weight={isGreen ? 'medium' : undefined}>
        {ratioStr}
      </Text>
    </Text>
  );

  if (isWinner) {
    return (
      <div className={WINNER_CELL}>
        {inner}
      </div>
    );
  }
  return inner;
}

/** Build the combined Gate 1e cell: "avg_score / item_count / threshold" with green on score ≥ threshold.
 *  Full cell background when winner (highest avg_score). German comma decimal. */
function renderGate1eCombined(gate: GateResult | undefined, isWinner: boolean): ReactNode {
  if (!gate || gate.status === 'skipped') return '–';
  const score = parseNum(gate.details['avg_score']);
  const count = parseNum(gate.details['item_count']);
  const threshold = parseNum(gate.details['threshold']);
  if (score === null) return '–';

  const scoreStr = score.toFixed(2).replace('.', ',');
  const countStr = count !== null ? String(count) : '?';
  const thresholdStr = threshold !== null ? threshold.toFixed(2).replace('.', ',') : '?';
  const isGreen = threshold !== null && score >= threshold;

  const inner = (
    <Text as="span" size="xs" align="center">
      <Text as="span" color={isGreen ? 'success' : 'error'} weight="medium">
        {scoreStr}
      </Text>
      {` / ${countStr} / ${thresholdStr}`}
    </Text>
  );

  if (isWinner) {
    return (
      <div className={WINNER_CELL}>
        {inner}
      </div>
    );
  }
  return inner;
}

// ── Table state (minimal – no pagination needed) ───────────────

const TABLE_KEY = 'eval-comparison';
const DUMMY_STATE: TableStateProps<ComparisonRow> = {
  data: [],
  total: 0,
  q: '',
  page: 0,
  size: 100,
  sort: '',
  order: 'asc',
  tableKey: TABLE_KEY,
  setQ: () => {},
  setPage: () => {},
  setSize: () => {},
  setSort: () => {},
  handleSearchChange: () => {},
  resetUrlState: () => {},
};

// ── Component ──────────────────────────────────────────────────

/**
 *
 */
export default function EvalComparisonTable({ runs, modelLabels }: EvalComparisonTableProps) {
  const modelCols = useMemo(() =>
    runs.filter(r => r.model_config_id !== null).map(r => ({
      id: r.model_config_id!,
      label: modelLabels?.[r.model_config_id!] ?? `#${r.model_config_id}`,
    })),
  [runs, modelLabels]);

  // Columns: "Metrik" + one per model
  const columns: Record<string, TableColumnProps> = useMemo(() => {
    const cols: Record<string, TableColumnProps> = {
      metric: { label: 'Metrik', width: '220px', sortable: false },
    };
    modelCols.forEach((mc) => {
      cols[`model_${mc.id}`] = {
        label: mc.label,
        width: '160px',
        sortable: false,
        compact: true,
        alignment: 'center',
      };
    });
    return cols;
  }, [modelCols]);

  // Build data rows from runs
  const data: ComparisonRow[] = useMemo(() => {
    const rows: ComparisonRow[] = [];
    // Use the first run that actually HAS gate_results for gate ordering.
    const runWithGates = runs.find(r => (r.gate_results ?? []).length > 0);
    const gateOrder = runWithGates?.gate_results?.map(g => g.gate) ?? [];

    gateOrder.forEach((gateId) => {
      const layout = GATE_LAYOUT[gateId];
      if (!layout) return;

      // One row per gate — no separate group header.
      layout.metrics.forEach((md) => {
        const metricLabel = layout.help
          ? (
            <div className={METRIC_LABEL} title={layout.help}>
              {layout.label}
              <Icon name="info" size="xs" variant="muted" />
            </div>
          )
          : layout.label;

        const row: ComparisonRow = {
          type: 'metric',
          __gateId: gateId,
          id: `metric-${gateId}-${md.key}`,
          metric: metricLabel,
        } as ComparisonRow;

        modelCols.forEach((mc) => {
          const run = runs.find(r => r.model_config_id === mc.id);
          const gate = (run?.gate_results ?? []).find(g => g.gate === gateId);

          if (md.key === '_contract_validation' || md.key === '_schema_validation') {
            const status = gate?.status ?? '–';
            const color = status === 'passed' ? 'success'
              : status === 'failed' ? 'error'
              : status === 'blocked' ? 'warning-subtle'
              : 'muted';
            row[`model_${mc.id}`] = (
              <Text as="span" size="xs" weight="medium" color={color}>{status}</Text>
            );
          } else if (md.key === '_combined_client_latency') {
            const winner = md.winnerKey
              ? findWinner(runs, gateId, md.winnerKey, md.lowerIsBetter)
              : null;
            row[`model_${mc.id}`] = renderGate1cCombined(gate, winner === mc.id);
          } else if (md.key === '_combined_baseline_latency') {
            const winner = md.winnerKey
              ? findWinner(runs, gateId, md.winnerKey, md.lowerIsBetter)
              : null;
            row[`model_${mc.id}`] = renderGate1dCombined(gate, winner === mc.id);
          } else if (md.key === '_combined_golden_regression') {
            const winner = md.winnerKey
              ? findWinner(runs, gateId, md.winnerKey, md.lowerIsBetter)
              : null;
            row[`model_${mc.id}`] = renderGate1eCombined(gate, winner === mc.id);
          } else {
            // Standard metric cell with winner highlighting
            const winner = findWinner(runs, gateId, md.key, md.lowerIsBetter);
            const val = gate?.details[md.key];
            const isWinner = winner === mc.id;
            const text = fmt(val, md.unit, md);
            if (isWinner && val !== null && val !== undefined) {
              row[`model_${mc.id}`] = (
                <div className={WINNER_BADGE}>
                  <Text as="span" size="xs" weight="medium" color="success">{text}</Text>
                </div>
              );
            } else {
              row[`model_${mc.id}`] = text;
            }
          }
        });
        rows.push(row);
      });
    });

    return rows;
  }, [runs, modelCols]);

  // Row variant: group headers get muted background + border
  const getRowVariant = useCallback((row: ComparisonRow) => {
    if (row.type === 'group') return 'group' as const;
    return 'default' as const;
  }, []);

  if (runs.length === 0) return null;
  if (modelCols.length === 0) return null;

  return (
    <Table
      table={{ ...DUMMY_STATE, data, total: data.length }}
      columns={columns}
      getRowVariant={getRowVariant as (row: ComparisonRow) => 'default' | 'group' | undefined}
    />
  );
}
