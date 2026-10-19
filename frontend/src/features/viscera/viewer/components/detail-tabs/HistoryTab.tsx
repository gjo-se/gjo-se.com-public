import { cva } from 'class-variance-authority';

import Text from '@src/components/primitives/Text/Text';
import { formatDateOnly } from '@src/lib/formatDate';

import { useGitHistory } from '../../hooks/useGitHistory';

const textCellVariants = cva('min-w-0 break-words');
const fieldChipVariants = cva('rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800');

// ── Props ────────────────────────────────────────────────────────────────────

export interface HistoryTabProps {
  objectId: string | null;
  filename?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Displays Git commit history for a specific object in the architecture YAML.
 *
 * Uses {@link useGitHistory} internally and renders three states:
 * - Loading: centered "Loading history..." text
 * - Empty:   "Keine Änderungen in Git gefunden" message
 * - Data:    list of commits with hash, author, date, and changed fields
 */
export function HistoryTab({ objectId, filename = 'workspace.yml' }: HistoryTabProps) {
  const { commits, loading } = useGitHistory(objectId, filename);

  return (
    <div>
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Text color="muted" size="sm">Loading history...</Text>
        </div>
      )}

      {!loading && commits.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Text color="muted" size="sm">
            Keine Änderungen in Git gefunden
          </Text>
        </div>
      )}

      {!loading && commits.length > 0 && (
        <div className="flex flex-col gap-0 divide-y divide-gray-100 dark:divide-gray-800">
          {commits.map((commit) => (
            <div key={commit.hash} className="py-3 px-1">
              <div className="flex items-start justify-between gap-2">
                <div className={textCellVariants()}>
                  <Text size="sm" weight="semibold">
                    {commit.message}
                  </Text>
                </div>
                <div className="shrink-0">
                  <Text size="xs" color="muted">
                    {formatDateOnly(commit.date)}
                  </Text>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Text size="xs" color="muted">
                  {commit.author}
                </Text>
                <Text size="xs" color="muted">
                  {commit.hash.slice(0, 7)}
                </Text>
              </div>
              {commit.changed_fields.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {commit.changed_fields.map((field) => (
                    <div
                      key={field}
                      className={fieldChipVariants()}
                    >
                      <Text size="xs" color="muted">
                        {field}
                      </Text>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
