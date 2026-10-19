import { cva } from 'class-variance-authority';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AlertDialog from '@src/components/primitives/AlertDialog/AlertDialog';
import Button from '@src/components/primitives/Button/Button';
import Card from '@src/components/primitives/Card/Card';
import Icon from '@src/components/primitives/Icon/Icon';
import Input from '@src/components/primitives/Input/Input';
import Text from '@src/components/primitives/Text/Text';
import { DIAGRAM_LEVELS } from '@src/features/viscera/core/levelRegistry';
import type { Diagram, ViewType } from '@src/features/viscera/core/workspaceSchema';
import type { ViewStatusCounts } from '@src/features/viscera/viewer/hooks/useViewStatusCounts';
import { cn } from '@src/lib/utils';

// ── Props ────────────────────────────────────────────────────────────────────

export interface DiagramsDropdownProps {
  /** Diagrams from the API — SSOT for list, status, scan_meta and node counts (R1). */
  diagrams: Diagram[];
  /** Currently active diagram key. */
  currentViewKey: string;
  /** Called when the user selects a diagram. */
  onSelect: (key: string) => void;
  /** Status counts per diagram key (pending / scan_missing / bug) — derived from diagram.nodes. */
  statusCounts?: Record<string, ViewStatusCounts>;
  /** Number of unassigned objects. Shown as badge when > 0. */
  unassignedCount?: number;
  /** Called when user clicks "+ Diagram" button. */
  onCreateDiagram?: () => void;
  /** Called when user clicks delete icon on a diagram entry. */
  onDeleteDiagram?: (key: string) => void;
  /** Called when user clicks edit icon on a diagram entry. */
  onEditDiagram?: (key: string) => void;
  /** Called when user clicks the unassigned badge. */
  onShowUnassigned?: () => void;
  /** Called when the user accepts a pending scanner diagram (#2263). */
  onAcceptDiagram?: (key: string) => void;
  /** Called when the user confirms rejection of a pending scanner diagram (#2263). */
  onRejectDiagram?: (key: string) => void;
}

// ── Status Badges (#2263) ───────────────────────────────────────────────────

const DIAGRAM_STATUS_BADGES: Record<string, string> = {
  'viscera-approved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'viscera-pending': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

const DIAGRAM_STATUS_FALLBACK = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';

const REJECT_DIALOG_DESCRIPTION =
  'Diagramm wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.';

const unassignedBadgeVariants = cva(
  'ml-1 inline-flex items-center rounded-full bg-amber-100 px-1.5 text-2xs font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200',
);
const overlayVariants = cva('absolute left-0 top-full z-50 mt-1 min-w-60');
const listScrollVariants = cva('max-h-72 overflow-y-auto');
const itemLeftVariants = cva('flex items-center gap-1.5 min-w-0');
const truncateVariants = cva('truncate');
const countPendingVariants = cva(
  'rounded-full bg-amber-100 px-1.5 text-2xs font-semibold text-amber-800',
);
const countMissingVariants = cva(
  'rounded-full bg-gray-100 px-1.5 text-2xs font-semibold text-gray-600',
);
const confirmMarkVariants = cva('ml-0.5 text-2xs text-red-500');
const unassignedRowVariants = cva(
  'cursor-pointer border-t border-gray-200 px-3 py-2 text-sm transition-colors hover:bg-amber-50 dark:border-gray-700 dark:hover:bg-amber-900/20',
);
const unassignedTextVariants = cva('text-amber-700 dark:text-amber-300');
const footerVariants = cva('border-t border-gray-200 px-2 py-1.5 dark:border-gray-700');

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Diagrams-Dropdown für das Viscera.
 *
 * Button "Diagrams" in der Toolbar → Overlay mit Suchbox
 * + gruppierter Liste nach C4-Level (Context / App / Component).
 *
 * Features:
 * - "+ Diagram" button in footer
 * - Delete icon per entry (hover)
 * - "⚡ N unassigned" badge (clickable)
 */
export default function DiagramsDropdown({
  diagrams,
  currentViewKey,
  onSelect,
  statusCounts,
  unassignedCount = 0,
  onCreateDiagram,
  onDeleteDiagram,
  onEditDiagram,
  onShowUnassigned,
  onAcceptDiagram,
  onRejectDiagram,
}: DiagramsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [rejectKey, setRejectKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Group & filter ───────────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const buckets = DIAGRAM_LEVELS.map((l) => [l.diagramType, [] as Diagram[]] as const);
    const groups = Object.fromEntries(buckets) as Record<ViewType, Diagram[]>;
    const q = searchQuery.toLowerCase();
    diagrams.forEach((diagram) => {
      if (q && !diagram.key.toLowerCase().includes(q)) return;
      groups[diagram.type].push(diagram);
    });
    return groups;
  }, [diagrams, searchQuery]);

  const hasResults = Object.values(grouped).some((g) => g.length > 0);

  // ── Click outside handler ────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        setIsOpen(false);
        setSearchQuery('');
        setConfirmDeleteKey(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // ── Keyboard handler ─────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        setConfirmDeleteKey(null);
      }
    },
    [],
  );

  // ── Select handler ───────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (key: string) => {
      onSelect(key);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onSelect],
  );

  // ── Delete handler ───────────────────────────────────────────────────────

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, key: string) => {
      e.stopPropagation();
      if (confirmDeleteKey === key) {
        onDeleteDiagram?.(key);
        setConfirmDeleteKey(null);
      } else {
        setConfirmDeleteKey(key);
      }
    },
    [confirmDeleteKey, onDeleteDiagram],
  );

  // ── Create handler ───────────────────────────────────────────────────────

  const handleCreate = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    onCreateDiagram?.();
  }, [onCreateDiagram]);

  // ── Unassigned handler ──────────────────────────────────────────────────

  const handleUnassignedClick = useCallback(() => {
    setIsOpen(false);
    onShowUnassigned?.();
  }, [onShowUnassigned]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* ── Trigger ── */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Diagramm wechseln"
      >
        Diagrams
        {unassignedCount > 0 && (
          <div className={unassignedBadgeVariants()}>
            ⚡{unassignedCount}
          </div>
        )}
        <Icon name="chevron-down" size="xs" shrink rotate={isOpen} aria-hidden />
      </Button>

      {/* ── Overlay ── */}
      {isOpen && (
        <div className={overlayVariants()}>
          <Card variant="default" size="sm">
            {/* Search */}
            <div className="px-2 pt-2">
              <Input
                placeholder="Diagramm suchen…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Icon name="search" size="xs" aria-hidden />}
                aria-label="Diagramm-Namen filtern"
              />
            </div>

            {/* List */}
            <div className={listScrollVariants()}>
              {!hasResults && (
                <div className="px-3 py-2">
                  <Text size="sm" color="muted">
                    Keine Diagramme gefunden.
                  </Text>
                </div>
              )}

              {DIAGRAM_LEVELS.map((level) => {
                const levelDiagrams = grouped[level.diagramType];
                if (levelDiagrams.length === 0) return null;
                return (
                  <div key={level.diagramType}>
                    <div className="px-3 py-1">
                      <Text size="xs" weight="medium" color="muted" uppercase>
                        {level.levelLabel}
                      </Text>
                    </div>
                    {levelDiagrams.map((diagram) => {
                       const showDelete = hoveredKey === diagram.key || confirmDeleteKey === diagram.key;
                       const showEdit = hoveredKey === diagram.key && confirmDeleteKey !== diagram.key;
                       const isPendingScannerDiagram =
                         diagram.scan_meta != null && diagram.status === 'pending';
                       return (
                         <div
                           key={diagram.key}
                           role="option"
                           aria-selected={diagram.key === currentViewKey}
                           onClick={() => {
                            if (confirmDeleteKey === diagram.key) return;
                            handleSelect(diagram.key);
                          }}
                           onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelect(diagram.key);
                            }
                          }}
                           onMouseEnter={() => setHoveredKey(diagram.key)}
                           onMouseLeave={() => setHoveredKey(null)}
                           tabIndex={0}
                           className={cn(
                            'group flex cursor-pointer items-center justify-between px-3 py-1.5 text-sm transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20',
                            diagram.key === currentViewKey &&
                              'bg-blue-100 font-medium dark:bg-blue-900/40',
                          )}
                         >
                           <div className={itemLeftVariants()}>
                             <div className={truncateVariants()}>
                               <Text as="span" size="sm" color="on-surface">{diagram.key}</Text>
                             </div>
                             {(() => {
                              const counts = statusCounts?.[diagram.key];
                              if (!counts) return null;
                              return (
                                <div className="ml-1 inline-flex gap-1 shrink-0">
                                  {counts.pending > 0 && (
                                  <div className={countPendingVariants()}>
                                    {counts.pending}
                                  </div>
                                   )}
                                  {counts.scan_missing > 0 && (
                                  <div className={countMissingVariants()}>
                                    {counts.scan_missing}
                                  </div>
                                   )}
                                </div>
                              );
                            })()}
                             <div
                               className={cn(
                                  'ml-1 shrink-0 rounded-full px-1.5 text-2xs font-semibold',
                                  DIAGRAM_STATUS_BADGES[diagram.status] ?? DIAGRAM_STATUS_FALLBACK,
                               )}
                             >
                               {diagram.status}
                             </div>
                             {isPendingScannerDiagram && (
                             <div className="ml-1 inline-flex shrink-0 gap-0.5">
                               {onAcceptDiagram && (
                               <Button
                                 variant="ghost"
                                 size="xs"
                                 onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      onAcceptDiagram(diagram.key);
                                    }}
                                 title="Akzeptieren (vor Re-Scan schützen)"
                                 tabIndex={-1}
                               >
                                 <Icon name="check" size="xs" />
                               </Button>
                               )}
                               {onRejectDiagram && (
                               <Button
                                 variant="destructive"
                                 size="xs"
                                 onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      setRejectKey(diagram.key);
                                    }}
                                 title="Ablehnen (Diagramm löschen)"
                                 tabIndex={-1}
                               >
                                 <Icon name="x" size="xs" />
                               </Button>
                               )}
                             </div>
                            )}
                           </div>
                           {showEdit && onEditDiagram && (
                           <Button
                             variant="menu-icon"
                             size="none"
                             onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onEditDiagram(diagram.key);
                              }}
                             title="Diagramm bearbeiten"
                             tabIndex={-1}
                           >
                             <Icon name="pencil" size="xs" />
                           </Button>
                          )}
                           {showDelete && onDeleteDiagram && (
                           <Button
                             variant={
                               confirmDeleteKey === diagram.key
                                 ? 'menu-icon-danger-active'
                                 : 'menu-icon-danger'
                             }
                             size="none"
                             onClick={(e: React.MouseEvent) =>
                                handleDeleteClick(e, diagram.key)
                              }
                             title={
                                confirmDeleteKey === diagram.key
                                  ? 'Klicken zum Bestätigen'
                                  : 'Diagramm löschen'
                              }
                             tabIndex={-1}
                           >
                             <Icon name="trash-2" size="xs" />
                             {confirmDeleteKey === diagram.key && (
                             <div className={confirmMarkVariants()}>?</div>
                               )}
                           </Button>
                          )}
                         </div>
                       );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Unassigned Badge */}
            {unassignedCount > 0 && onShowUnassigned && (
              <div
                className={unassignedRowVariants()}
                onClick={handleUnassignedClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleUnassignedClick();
                  }
                }}
              >
                <div className={unassignedTextVariants()}>
                  <Text as="span" size="sm" color="inherit">
                    ⚡ {unassignedCount} unassigned
                  </Text>
                </div>
              </div>
            )}

            {/* Footer: Create Diagram */}
            {onCreateDiagram && (
              <div className={footerVariants()}>
                <Button
                  variant="menu-link"
                  size="none"
                  onClick={handleCreate}
                >
                  ＋ Diagram
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Reject Confirmation Dialog (#2263) ── */}
      <AlertDialog
        open={rejectKey !== null}
        onOpenChange={(open) => {
          if (!open) setRejectKey(null);
        }}
        title="Diagramm ablehnen"
        description={REJECT_DIALOG_DESCRIPTION}
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        destructive
        onConfirm={() => {
          if (rejectKey) {
            onRejectDiagram?.(rejectKey);
          }
          setRejectKey(null);
          setIsOpen(false);
          setSearchQuery('');
          setConfirmDeleteKey(null);
        }}
      />
    </div>
  );
}
