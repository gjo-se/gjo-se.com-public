import Text from '@src/components/primitives/Text';

import { DASH, ROW } from './constants';

/** Fallback renderer: prints every data key/value pair for an unknown act. */
export default function GenericActData({ data }: { data: Record<string, unknown> }) {
  if (!data || typeof data !== 'object') return null;

  const entries = Object.entries(data).filter(
    ([key]) => key !== 'project_id' && key !== 'call_log_id',
  );

  if (entries.length === 0) return null;

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {entries.map(([key, value]) => (
        <div key={key} className={ROW}>
          <Text size="xs" weight="medium" color="muted" uppercase>
            {key.replace(/_/g, ' ')}
          </Text>
          <Text size="xs" color="muted">
            {typeof value === 'object' ? JSON.stringify(value) : String(value ?? DASH)}
          </Text>
        </div>
      ))}
    </div>
  );
}
