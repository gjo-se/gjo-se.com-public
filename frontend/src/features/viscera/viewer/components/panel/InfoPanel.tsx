import { cva } from 'class-variance-authority';
import { useCallback, useState } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Text from '@src/components/primitives/Text/Text';
import type { Edge } from '@src/features/viscera/core/workspaceSchema';

const containerBadgeVariants = cva(
  'rounded bg-container-badge px-2 py-0.5 text-xs font-semibold text-gray-100',
);
const tagBadgeVariants = cva(
  'rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200',
);

const DESC_BOX_CLASS =
  'relative rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900';
const REL_WRAPPER_CLASS = 'overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700';

export interface InfoPanelProps {
  /** Container display name (e.g. "FastAPI App"). */
  containerName: string;
  /** Technology display name (e.g. "FastAPI") — derived from technologies[0]. */
  technologyName: string;
  /** LLM-ready prose description. */
  description: string;
  /** Container tags (e.g. ["Backend"]). */
  tags?: string[];
  /** Edges that involve this container. */
  edges?: Edge[];
}

const COPY_FEEDBACK_MS = 2000;

/**
 * Info-Panel for a container that has no `d2`/`stately` detail diagram.
 *
 * Shows container metadata (description, tags, technology) and
 * related edges. Includes a "Copy for Kilo" button that
 * copies the LLM-ready description to the clipboard.
 */
export default function InfoPanel({
  containerName,
  technologyName,
  description,
  tags,
  edges,
}: InfoPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(description);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // Clipboard API not available — silently ignore
    }
  }, [description]);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Text variant="h3" weight="bold">
              {containerName}
            </Text>
            <div className={containerBadgeVariants()}>
              Container
            </div>
          </div>
          <Text color="muted" size="sm">
            {technologyName}
          </Text>
        </div>
      </div>

      {/* Description */}
      <div>
        <div className="mb-2 block">
          <Text weight="semibold" size="sm">
            Description (LLM-ready)
          </Text>
        </div>
        <div className={DESC_BOX_CLASS}>
          <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-sans">
            {description}
          </pre>
          <div className="mt-3 flex justify-end">
            <Button
              variant={copied ? 'default' : 'outline'}
              size="sm"
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy for Kilo'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div>
          <div className="mb-2 block">
            <Text weight="semibold" size="sm">
              Tags
            </Text>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <div
                key={tag}
                className={tagBadgeVariants()}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technology */}
      <div>
        <div className="mb-1 block">
          <Text weight="semibold" size="sm">
            Technology
          </Text>
        </div>
        <Text color="muted" size="sm">
          {technologyName}
        </Text>
      </div>

      {/* Edges */}
      {edges && edges.length > 0 && (
        <div>
          <div className="mb-2 block">
            <Text weight="semibold" size="sm">
              Edges
            </Text>
          </div>
          <div className={REL_WRAPPER_CLASS}>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                    From → To
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                    Description
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                    Technology
                  </th>
                </tr>
              </thead>
              <tbody>
                {edges.map((rel) => (
                  <tr
                    key={`${rel.from}-${rel.to}-${rel.description ?? ''}-${rel.technology ?? ''}-${rel.status ?? ''}`}
                    className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                  >
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                      {rel.from} → {rel.to}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                      {rel.description ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                      {rel.technology ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
