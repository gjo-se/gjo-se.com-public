import { useCallback, useMemo } from 'react';

import CodeBlock from '@src/components/primitives/CodeBlock';
import Text from '@src/components/primitives/Text';
import Table from '@src/components/table';
import type { TableColumnProps, TableRowActionsProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useTableUrlState } from '@src/components/table/useTableUrlState';


// ── Types ─────────────────────────────────────────────────────────────────

interface HelpTableResult {
  table: TableStateProps<RecRow>;
  columns: Record<string, TableColumnProps>;
  rowActions: TableRowActionsProps<RecRow>[];
}

interface RecRow {
  parameter: string;
  range: string;
  def: string;
  merge: string;
  extraction: string;
  chat: string;
  creative: string;
}

// ── Data ───────────────────────────────────────────────────────────────────

const REC_ROWS: RecRow[] = [
  { parameter: 'Temperature', range: '0.0 \u2013 2.0', def: '1.0', merge: '0.1', extraction: '0.0', chat: '0.7', creative: '0.8' },
  { parameter: 'Max Tokens', range: '1 \u2013 Modell-Limit', def: '2.000', merge: '2.000', extraction: '500', chat: '4.000', creative: '8.000' },
  { parameter: 'Top P', range: '0.0 \u2013 1.0', def: '1.0', merge: '1.0', extraction: '1.0', chat: '0.9', creative: '0.9' },
  { parameter: 'Reasoning', range: 'off / low / medium / high', def: 'off', merge: 'off', extraction: 'medium', chat: 'medium', creative: 'high' },
];

const TABLE_KEY = 'hyperparameter-help';

// ── Props ──────────────────────────────────────────────────────────────────

interface HyperparameterHelpContentProps {
  open: boolean;
  /** Optional task key from TASK_REGISTRY. Not yet wired – reserved for future column highlighting. */
  taskKey?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

/** Inline-Hilfe f&uuml;r Hyperparameter – Tabelle mit Use-Case-Spalten + Text. */
export default function HyperparameterHelpContent({ open, taskKey: _taskKey }: HyperparameterHelpContentProps) {
  const { table, columns } = useHelpTable();

  if (!open) return null;

  return (
    <section className="space-y-6 mt-4">
      <Table<RecRow>
        table={table}
        columns={columns}
        rowActions={[]}
        emptyMessage="Keine Daten."
      />

      <section>
        <Text weight="semibold">Erl&auml;uterungen</Text>
        <div className="mb-2" />

        <section className="mb-3">
          <Text weight="semibold">Temperature</Text>
          <Text size="sm" color="muted">
            Kontrolliert die Zuf&auml;lligkeit. Niedrig (0.0&ndash;0.3) f&uuml;r deterministische Tasks
            wie Extraction/Merge. H&ouml;her (0.7&ndash;1.5) f&uuml;r kreative Texte.
            Werte &uuml;ber 1.5 f&uuml;hren zu inkoh&auml;renten Outputs.
          </Text>
        </section>

        <section className="mb-3">
          <Text weight="semibold">Max Tokens</Text>
          <Text size="sm" color="muted">
            Maximale Output-L&auml;nge in Tokens. Begrenzt Kosten und Latenz.
            F&uuml;r strukturierte Outputs: 500&ndash;2.000. Kreative Texte: 4.000&ndash;8.000.
          </Text>
        </section>

        <section className="mb-3">
          <Text weight="semibold">Top P</Text>
          <Text size="sm" color="muted">
            Nucleus Sampling. W&auml;hlt Tokens bis die kumulative Wahrscheinlichkeit erreicht ist.
            Mit 1.0 deaktiviert. Nicht mit Temperature kombinieren.
          </Text>
        </section>

        <section className="mb-3">
          <Text weight="semibold">Reasoning</Text>
          <Text size="sm" color="muted">
            Chain-of-Thought-Denken vor der Antwort. Das Modell verbraucht Tokens f&uuml;r
            internes Reasoning (von max_tokens abgezogen). H&ouml;here Stufen verbessern
            komplexe Analysen, erh&ouml;hen aber Latenz und Kosten.
            Budget: low=1.024, medium=4.096, high=16.384 Tokens.
          </Text>
        </section>

        <section className="mb-3">
          <Text weight="semibold">Frequency / Presence Penalty</Text>
          <Text size="sm" color="muted">
            Nur im &bdquo;Erweitert&ldquo;-JSON-Feld. Frequency reduziert Wiederholungen,
            Presence f&ouml;rdert neue Themen. Bereich -2.0 bis 2.0.
          </Text>
          <section className="mt-2">
            <CodeBlock
              language="json"
              code={`{
  "frequency_penalty": 0.0,
  "presence_penalty": 0.0
}`}
              filename="Vorlage"
            />
          </section>
        </section>
      </section>
    </section>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────

function useHelpTable(): HelpTableResult {
  const { q, page, size, sort, order, setQ, setPage, setSize, setSort, resetUrlState } =
    useTableUrlState(TABLE_KEY);

  const handleSearchChange = useCallback((value: string) => {
    setQ(value);
    setPage(0);
  }, [setQ, setPage]);

  const columns: Record<string, TableColumnProps> = useMemo(() => ({
    parameter: { label: 'Parameter', width: '160px', search: true, defaultSort: 'asc' },
    range: { label: 'Bereich', width: '150px', search: true, sortField: 'range' },
    def: { label: 'Default', width: '100px', sortField: 'def' },
    merge: { label: 'merge', width: '110px', sortField: 'merge' },
    extraction: { label: 'extraction', width: '110px', sortField: 'extraction' },
    chat: { label: 'chat', width: '110px', sortField: 'chat' },
    creative: { label: 'creative', width: '110px', sortField: 'creative' },
  }), []);

  return {
    table: buildTableState({
      data: REC_ROWS,
      total: REC_ROWS.length,
      q, page, size, sort, order, tableKey: TABLE_KEY,
      setQ, setPage, setSize, setSort,
      handleSearchChange, resetUrlState,
    }),
    columns,
    rowActions: [],
  };
}
