import ErrorState from '@src/components/molecules/ErrorState/ErrorState';
import Accordion from '@src/components/primitives/Accordion';
import Chip from '@src/components/primitives/Chip';
import Text from '@src/components/primitives/Text';
import type { TaskExamplesResponse, TriggerObservation, TriggerStatsResponse } from '@src/features/llm/services/triggerObserverService';

import { skeletonLineCls } from './constants';

export interface TriggerObserverCardProps {
  triggerStats: TriggerStatsResponse | null;
  taskExamples: TaskExamplesResponse | null;
  loading: boolean;
  error: string | null;
}

/** Compute a human-readable relative time string (German, de-DE). */
function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  const diffHours = Math.round(diffMs / 3_600_000);
  const diffDays = Math.round(diffMs / 86_400_000);

  const rtf = new Intl.RelativeTimeFormat('de-DE', { numeric: 'auto' });
  if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute');
  if (diffHours < 24) return rtf.format(-diffHours, 'hour');
  return rtf.format(-diffDays, 'day');
}

/** Organism: displays live trigger stats, input/output examples from the call log. */
export default function TriggerObserverCard({
  triggerStats,
  taskExamples,
  loading,
  error,
}: TriggerObserverCardProps) {
  if (error) {
    return (
      <ErrorState
        code="500"
        title="Live-Daten nicht verfügbar"
        description={error}
      />
    );
  }

  const accordionItems = [
    {
      id: 'input',
      title: 'Letzter Input',
      content: loading ? (
        <div className="space-y-2">
          <div className={skeletonLineCls('w-full')} />
          <div className={skeletonLineCls('w-3/4')} />
        </div>
      ) : taskExamples?.input_example ? (
        <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
          {JSON.stringify(taskExamples.input_example, null, 2)}
        </pre>
      ) : (
        <Text size="sm" color="muted">Kein Input-Beispiel vorhanden.</Text>
      ),
    },
    {
      id: 'output',
      title: 'Output',
      content: loading ? (
        <div className="space-y-2">
          <div className={skeletonLineCls('w-full')} />
          <div className={skeletonLineCls('w-5/6')} />
          <div className={skeletonLineCls('w-4/5')} />
          <div className={skeletonLineCls('w-2/3')} />
        </div>
      ) : (
        <div className="space-y-4">
          {taskExamples?.output_schema && (
            <div>
              <div className="mb-1">
                <Text size="sm" weight="semibold">JSON Schema</Text>
              </div>
              <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(taskExamples.output_schema, null, 2)}
              </pre>
            </div>
          )}
          {taskExamples?.output_example !== null && taskExamples?.output_example !== undefined ? (
            <div>
              <div className="mb-1">
                <Text size="sm" weight="semibold">Letztes Beispiel</Text>
              </div>
              <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                {typeof taskExamples.output_example === 'string'
                  ? taskExamples.output_example
                  : JSON.stringify(taskExamples.output_example, null, 2)}
              </pre>
            </div>
          ) : (
            !taskExamples?.output_schema && (
              <Text size="sm" color="muted">Kein Output-Beispiel vorhanden.</Text>
            )
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Trigger Section ─────────────────────────────────────────── */}
      <div>
        <div className="mb-3">
          <Text size="sm" weight="semibold">Trigger</Text>
        </div>
        {loading && (
          <div className="space-y-2">
            {['w-3/5', 'w-2/5', 'w-4/5'].map((w) => (
              <div key={w} className={`${w} h-4 animate-pulse rounded bg-muted`} />
            ))}
          </div>
        )}
        {!loading && triggerStats && (
          <div className="space-y-2">
            {triggerStats.observed.map((obs: TriggerObservation) => (
              <div className="flex items-center gap-2" key={obs.trigger}>
                <Chip variant="success" size="sm">
                  {obs.trigger}
                  <Text as="span" size="xs">
                    {' '}{obs.count}
                  </Text>
                </Chip>
                {obs.last_seen && (
                  <Text as="span" size="xs" color="muted">
                    {formatRelativeTime(obs.last_seen)}
                  </Text>
                )}
              </div>
            ))}
            {triggerStats.unused.map((t: string) => (
              <div className="flex items-center gap-2" key={t}>
                <Chip variant="muted" size="sm">{t}</Chip>
                <Text as="span" size="sm" color="muted">Noch nie ausgeführt</Text>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Input / Output Sections ─────────────────────────────────── */}
      <Accordion items={accordionItems} />
    </div>
  );
}
