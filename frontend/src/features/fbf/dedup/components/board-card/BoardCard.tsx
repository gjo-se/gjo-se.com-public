/**
 * BoardCard – GitHub-Projects-style card for a single dedup board item.
 *
 * Fields: #ID + Name, Importance, Level (internal / public), colored status
 * badge (DB names), and slave count. The whole card is clickable:
 *   plain click     → select + pin
 *   cmd/ctrl click  → toggle in multi-selection
 * In similarity mode a % chip shows the distance to the selection.
 * Coloring follows the table scheme: white / gray-900 surface with
 * gray-200 / gray-700 border, hover bg-gray-50 (dark gray-800/50).
 * Selection is marked by a primary ring (pinned: softer primary ring).
 * The crown shows the slave count: muted when 0, regular foreground when > 0.
 * Drag behavior comes from the surrounding Draggable/Droppable row wrappers.
 */

import { useState } from 'react';

import Card, { CardContent } from '@src/components/primitives/Card';
import Chip from '@src/components/primitives/Chip';
import Icon from '@src/components/primitives/Icon/Icon';
import Input from '@src/components/primitives/Input';
import Text from '@src/components/primitives/Text';
import type { BoardItem } from '@src/features/fbf/dedup/services/dedup';
import type { SelectModifiers } from '@src/features/fbf/dedup/store/dedupStore';

import { statusChipVariant } from '../../utils/boardCard';
import { boardEditTriggerVariants } from '../../utils/dedupBoardVariants';

interface BoardCardProps {
  item: BoardItem
  isPinned: boolean
  isSelected: boolean
  onCardClick: (item: BoardItem, mods: SelectModifiers) => void
  /** Cosine similarity (0..1) to the current selection – shown as % chip. */
  similarity?: number
  /** Best single group member (group-refined masters): name to display. */
  bestMemberName?: string | null
  /** Best single group member similarity (0..1). */
  bestMemberSimilarity?: number | null
  /** Dim the card (selected sources while a drag is in progress). */
  dimmed?: boolean
  /** Highlight as the active drop target (amber surface + ring). */
  isDropHover?: boolean
  /** Called when the user confirms an inline rename (Enter or blur). */
  onRename?: (skillId: number, name: string) => void
}

/** GitHub-Projects-style board card – fully clickable with modifier-aware selection. */
export default function BoardCard({
  item, isPinned, isSelected, onCardClick, similarity,
  bestMemberName, bestMemberSimilarity, dimmed = false, isDropHover = false,
  onRename,
}: BoardCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.name);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(item.name);
    setEditing(true);
  };

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== item.name) {
      onRename?.(item.id, trimmed);
    } else {
      setDraft(item.name);
    }
    setEditing(false);
  };
  // Surface stays white/gray-900 with gray hover; selection is carried by a
  // colored (blue) ring so it never collides with the leading-column tint.
  // While hovered as a drop target the card turns amber (hover suppressed).
  const ringClasses = isDropHover
    ? '[&>[data-slot=card]]:ring-2 [&>[data-slot=card]]:ring-amber-500 dark:[&>[data-slot=card]]:ring-amber-400'
    : isSelected
      ? '[&>[data-slot=card]]:ring-2 [&>[data-slot=card]]:ring-blue-500 dark:[&>[data-slot=card]]:ring-blue-400'
      : isPinned
        ? '[&>[data-slot=card]]:ring-2 [&>[data-slot=card]]:ring-blue-500/40 dark:[&>[data-slot=card]]:ring-blue-400/40'
        : '[&>[data-slot=card]]:ring-gray-200 dark:[&>[data-slot=card]]:ring-gray-700';

  const surfaceClasses = isDropHover
    ? '[&>[data-slot=card]]:bg-amber-100 dark:[&>[data-slot=card]]:bg-amber-900/40'
    : '[&>[data-slot=card]]:bg-white dark:[&>[data-slot=card]]:bg-gray-900 [&>[data-slot=card]]:hover:bg-gray-50 dark:[&>[data-slot=card]]:hover:bg-gray-800/50';

  const hasSlaves = item.alias_count > 0;

  return (
    <div className={`cursor-pointer select-none rounded-xl transition-opacity [&>[data-slot=card]]:transition-colors ${surfaceClasses} ${dimmed ? 'opacity-40' : ''} ${ringClasses}`}>
      {/* No button role on the card: dnd-kit's PointerSensor ignores
          interactive targets, which would break dragging. Keyboard access
          is provided by the draggable row wrapper (dnd-kit attributes). */}
      <Card
        size="sm"
        data-selected={isSelected || undefined}
        data-pinned={isPinned || undefined}
        onClick={(e) => onCardClick(item, { meta: e.metaKey || e.ctrlKey, shift: e.shiftKey })}
      >
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <Text size="xs" color="muted">#{item.id}</Text>
              {editing ? (
                <Text
                  as="span"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <Input
                    key={`edit-${item.id}`}
                    value={draft}
                    autoFocus
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') {
                        setDraft(item.name);
                        setEditing(false);
                      }
                    }}
                  />
                </Text>
              ) : (
                <div
                  className={boardEditTriggerVariants()}
                  onClick={startEdit}
                >
                  <Text size="sm" weight="medium" color="inherit">
                    {item.name}
                  </Text>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {similarity !== undefined && (
                <Chip variant="info" size="sm">{Math.round(similarity * 100)} %</Chip>
              )}
              <Chip variant={statusChipVariant(item.status)} size="sm">{item.status}</Chip>
            </div>
          </div>

          {item.description && (
            <Text size="xs" color="muted" lineClamp={2}>{item.description}</Text>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Text size="xs" color="muted">Importance: {item.importance ?? '–'}</Text>
            <Text size="xs" color="muted">Level: {item.level ?? '–'} / {item.level_public ?? '–'}</Text>
            <div className="inline-flex items-center gap-1">
              {hasSlaves ? (
                <>
                  <Icon name="crown" size="sm" />
                  <Text size="xs">{item.alias_count}</Text>
                </>
              ) : (
                <>
                  <Icon name="crown" size="sm" variant="muted" />
                  <Text size="xs" color="muted">{item.alias_count}</Text>
                </>
              )}
            </div>
            {bestMemberName != null && bestMemberSimilarity != null && (
              <Text size="xs" color="muted">
                ≈ {bestMemberName} {Math.round(bestMemberSimilarity * 100)} %
              </Text>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
