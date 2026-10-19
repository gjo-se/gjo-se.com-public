import Link from '@src/components/primitives/Link';
import List from '@src/components/primitives/List';
import Text from '@src/components/primitives/Text';

import { ROW, TAG } from './constants';

/** Renders the act-3 (candidate research) data rows. */
export default function Act3Data({ data }: { data: Record<string, unknown> }) {
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const queries = Array.isArray(data.queries) ? data.queries : [];

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {queries.length > 0 && (
        <div className={ROW}>
          <div className="flex flex-wrap gap-1 items-center">
            <Text size="xs" weight="medium" color="muted">Such-Queries:</Text>
            {queries.map((q) => (
              <div key={String(q)} className={TAG}>
                <Text as="span" size="xs">{String(q)}</Text>
              </div>
            ))}
          </div>
        </div>
      )}
      {candidates.length > 0 && (
        <div className={ROW}>
          <div className="flex flex-col gap-1 basis-full">
            <Text size="xs" weight="medium" color="muted">
              {candidates.length} Kandidaten gefunden:
            </Text>
            <List
              as="ul"
              listStyle="disc"
              spacing="spaced"
              items={candidates.map((c: Record<string, unknown>) => (
                <Text as="span" key={String(c.url ?? c.company_name ?? c.title ?? '')} size="xs">
                  <Link href={String(c.url ?? '')} external variant="muted" size="sm">
                    {String(c.company_name ?? c.title ?? c.url)}
                  </Link>
                  {c.source != null && (
                    <Text as="span" size="xs" color="muted">
                      {' '}({String(c.source)})
                    </Text>
                  )}
                </Text>
              ))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
