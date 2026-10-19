/**
 * TagUsageSheet – Slide-over detail panel showing which entities use a core tag.
 *
 * Fetches tag usage summary from GET /admin/tagging/tags/{tag_id}/usage
 * and displays taggable_type → count breakdown.
 */

import { cva } from 'class-variance-authority';
import { useCallback, useEffect, useRef, useState } from 'react';

import Sheet from '@src/components/primitives/Sheet';
import SheetContent from '@src/components/primitives/Sheet/SheetContent';
import SheetDescription from '@src/components/primitives/Sheet/SheetDescription';
import SheetHeader from '@src/components/primitives/Sheet/SheetHeader';
import SheetTitle from '@src/components/primitives/Sheet/SheetTitle';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';
import { fetchCoreTagUsage, type TagUsageSummary } from '@src/lib/api/coreCatalog';
import { withAsyncState } from '@src/lib/withAsyncState';


import type { TagDefinitionRow } from '../../hooks/useTagDefinitionTable';

// ── Props ────────────────────────────────────────────────────────────────

export interface TagUsageSheetProps {
  tag: TagDefinitionRow | null;
  open: boolean;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────

/** Abgesetzte Gesamt-Fußzeile der Verwendungsliste. */
const usageFooterVariants = cva('pt-2 border-t border-gray-100 dark:border-gray-800');

/** Slide-over panel showing tag usage breakdown by entity type. */
export default function TagUsageSheet({ tag, open, onClose }: TagUsageSheetProps) {
  const [usage, setUsage] = useState<TagUsageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async (tagId: number) => {
    const result = await withAsyncState(setLoading, setError, () => fetchCoreTagUsage(tagId));
    if (result) setUsage(result);
  }, []);

  const prevTagId = useRef<number | null>(null);

  useEffect(() => {
    if (!tag || !open) return;
    if (prevTagId.current === tag.id) return;
    prevTagId.current = tag.id;
    void (async () => { await loadUsage(tag.id); })();
  }, [tag, open, loadUsage]);

  if (!tag) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent side="right" className="w-sheet sm:max-w-sheet">
        <SheetHeader>
          <SheetTitle>
            Verwendung: {tag.name}
          </SheetTitle>
          <SheetDescription>
            Entitäten, die diesen Tag verwenden
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <Text as="span" size="sm" color="muted">Lädt…</Text>
            </div>
          )}
          {error && <Text as="p" size="sm" color="error">{error}</Text>}
          {!loading && !error && usage.length === 0 && (
            <Text as="p" size="sm" color="muted">
              Dieser Tag wird von keinen Entitäten verwendet.
            </Text>
          )}
          {!loading && !error && usage.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {usage.map((u) => (
                <div key={u.taggable_type} className="flex items-center justify-between py-2">
                  <Text as="span" size="sm">
                    {u.taggable_type}
                  </Text>
                  <Text as="span" size="sm" color="muted">
                    {u.count} {u.count === 1 ? 'Entität' : 'Entitäten'}
                  </Text>
                </div>
              ))}
            </div>
          )}
          <div className={usageFooterVariants()}>
            <Text as="p" size="xs" color="muted">
              Gesamt: {tag.usage_count} {tag.usage_count === 1 ? 'Verwendung' : 'Verwendungen'}
            </Text>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
