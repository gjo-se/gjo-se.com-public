import Text from '@src/components/primitives/Text';

import { DASH, ROW } from './constants';

/** Renders the act-1 (research start) data row. */
export default function Act1Data({ data }: { data: Record<string, unknown> }) {
  const startedAt = typeof data.started_at === 'string' ? data.started_at : null;
  return (
    <div className={ROW}>
      <Text size="xs" color="muted">
        Recherche gestartet: {startedAt ? new Date(startedAt).toLocaleString('de-DE') : DASH}
      </Text>
    </div>
  );
}
