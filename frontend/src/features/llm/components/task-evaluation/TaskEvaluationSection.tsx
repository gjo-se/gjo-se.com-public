import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon';
import LoadingShell from '@src/components/primitives/LoadingShell/LoadingShell';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';
import EvalComparisonTable from '@src/features/llm/components/task-evaluation/EvalComparisonTable';
import { useTaskEvalRuns } from '@src/features/llm/hooks/useTaskEvalRuns';

// ── Props ─────────────────────────────────────────────────────

interface TaskEvaluationSectionProps {
  taskKey: string;
  /** model_config_id → display label for table headers. */
  modelLabels?: Record<number, string>;
}

// ── Component ─────────────────────────────────────────────────

/**
 *
 */
export default function TaskEvaluationSection({ taskKey, modelLabels }: TaskEvaluationSectionProps) {
  const { latestRun, latestBatch, loading, error, triggerEval, isRunning } = useTaskEvalRuns(taskKey);

  if (loading) return <LoadingShell />;

  const batchForTable = (latestBatch.length > 0 ? latestBatch : (latestRun ? [latestRun] : []))
    .filter(r => r.overall_status !== 'running')
    .filter(r => (r.gate_results ?? []).some(g => g.gate !== 'system'));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Text variant="h4">Evaluation</Text>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={triggerEval}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Spinner size="sm" />
              Läuft…
            </>
          ) : (
            <>
              <Icon name="play" size="sm" />
              Eval durchführen
            </>
          )}
        </Button>
      </div>
      {/* Error */}
      {error ? <Text size="sm" color="error">{error}</Text> : null}
      {/* Empty state */}
      {!latestRun && !isRunning && !error
        ? <Text size="sm" color="muted">Noch keine Evaluation durchgeführt.</Text>
        : null}
      {/* Comparison table */}
      {batchForTable.length > 0
        ? <EvalComparisonTable runs={batchForTable} modelLabels={modelLabels} />
        : null}
      {/* Run metadata */}
      {latestRun
        ? (
          <div className="flex items-center gap-4 pt-2">
            <Text size="xs" color="muted">{`Trigger: ${latestRun.trigger}`}</Text>
            <Text size="xs" color="muted">{new Date(latestRun.created_at).toLocaleString('de-DE')}</Text>
          </div>
        )
        : null}
    </div>
  );
}
