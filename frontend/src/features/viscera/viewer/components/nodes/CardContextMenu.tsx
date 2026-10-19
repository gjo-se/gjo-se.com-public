import { cva } from 'class-variance-authority';
import { useCallback, useImperativeHandle, useState } from 'react';
import { createPortal } from 'react-dom';

import Button from '@src/components/primitives/Button/Button';
import Card from '@src/components/primitives/Card/Card';
import Separator from '@src/components/primitives/Separator/Separator';
import Text from '@src/components/primitives/Text/Text';
import type { ChildDiagram } from '@src/features/viscera/core/workspaceSchema';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';
import { useCloseOnEscape } from '@src/features/viscera/viewer/hooks/useCloseOnEscape';
import { contextMenuPanelStyle } from '@src/features/viscera/viewer/utils/contextMenu';

import type { CardKind } from '../../utils/cardShape';
import type { MouseEvent, Ref } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Imperative handle: `CardNode` opens the menu from the card's `onContextMenu`. */
export interface CardContextMenuHandle {
  /** Opens the menu at the given viewport coordinates. */
  open: (x: number, y: number) => void;
}

interface CardContextMenuProps {
  ref?: Ref<CardContextMenuHandle>;
  nodeId: string;
  name: string;
  kind: CardKind;
  onCreateContainer?: (systemId: string) => void;
  onCreateComponent?: (containerId: string) => void;
  /** Child diagrams offered as navigation entries (sub-diagram drill-down). */
  childDiagrams?: ChildDiagram[];
  onNavigateToChild?: (childKey: string) => void;
  /** Opens a derived L3/L4 view for a node (parent = node id, level = 'component' | 'module'). */
  onOpenDerivedView?: (parentId: string, level: 'component' | 'module') => void;
  /** True for component cards – offers the L4 module entry even without children. */
  canOpenModuleView?: boolean;
  /** True for container cards – offers the L3 component entry even without children (#2491). */
  canOpenComponentView?: boolean;
}

interface CardMenuPosition {
  x: number;
  y: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const sectionLabelVariants = cva('px-3 py-1 tracking-wider text-gray-400');
const menuItemTextVariants = cva('block truncate');
const truncateVariants = cva('truncate');
const dangerTextVariants = cva('text-red-600 dark:text-red-400');
const dangerConfirmVariants = cva('pb-2 text-red-600 dark:text-red-400');

const CREATE_LABELS: Record<CardKind, string> = {
  system:    '＋ Container',
  person:    '＋ Container',
  container: '＋ Component',
  component: '＋ Component',
  store:     '＋ Component',
  table:     '＋ Container',
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Context menu overlay (portal): create child, navigate to sub-diagrams,
 * copy ID, delete with confirmation. Rendered by `CardNode` — all menu
 * state and handlers live here.
 */
export default function CardContextMenu({
  ref,
  nodeId,
  name,
  kind,
  onCreateContainer,
  onCreateComponent,
  childDiagrams,
  onNavigateToChild,
  onOpenDerivedView,
  canOpenModuleView = false,
  canOpenComponentView = false,
}: CardContextMenuProps) {
  const [position, setPosition] = useState<CardMenuPosition | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleting = false;
  const [copyFeedback, setCopyFeedback] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (x: number, y: number) => setPosition({ x, y }),
  }), []);

  const isOpen = position !== null;
  const showCreateButton = !!onCreateContainer || !!onCreateComponent;
  const createLabel = CREATE_LABELS[kind];

  // Sub-diagram drill-down entries (moved from the card-internal navigator overlay).
  const hasModuleChild = childDiagrams?.some((d) => d.level === 'module') ?? false;
  const hasAnyChild = (childDiagrams?.length ?? 0) > 0;
  const showSubDiagrams = hasAnyChild || canOpenComponentView || canOpenModuleView;

  const closeAll = useCallback(() => {
    setPosition(null);
    setConfirmingDelete(false);
  }, []);

  useCloseOnEscape(isOpen, closeAll);

  const handleCreateChild = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      closeAll();
      if (onCreateContainer) {
        onCreateContainer(nodeId);
      } else if (onCreateComponent) {
        onCreateComponent(nodeId);
      }
    },
    [nodeId, onCreateContainer, onCreateComponent, closeAll],
  );

  const handleNavigate = useCallback(
    (e: MouseEvent, childKey: string) => {
      e.stopPropagation();
      closeAll();
      onNavigateToChild?.(childKey);
    },
    [onNavigateToChild, closeAll],
  );

  const handleOpenDerived = useCallback(
    (e: MouseEvent, level: 'component' | 'module') => {
      e.stopPropagation();
      closeAll();
      onOpenDerivedView?.(nodeId, level);
    },
    [nodeId, onOpenDerivedView, closeAll],
  );

  const handleCopyId = useCallback(
    async (e: MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(nodeId);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 1500);
      } catch {
        // Clipboard API not available — silently ignore
      }
    },
    [nodeId],
  );

  const handleDeleteClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setConfirmingDelete(true);
  }, []);

  const handleDeleteCancel = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setConfirmingDelete(false);
  }, []);

  const handleDeleteConfirm = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();

      const store = useVisceraStore.getState();

      // Optimistic: remove node from canvas immediately + queue sync for persistence
      store.deleteNode(nodeId);
      store.queueSync({
        mutationId: crypto.randomUUID(),
        nodeId,
        action: 'delete',
        payload: {},
        retryCount: 0,
        status: 'pending',
      });

      closeAll();
    },
    [nodeId, closeAll],
  );

  if (!isOpen) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={closeAll}>
      <div
        style={contextMenuPanelStyle(position.x, position.y, 380)}
        onClick={(e) => e.stopPropagation()}
      >
        <Card size="sm">
          {showCreateButton && (
            <Button
              variant="menu-primary"
              size="none"
              onClick={handleCreateChild}
            >
              <Text size="sm" weight="medium">{createLabel}</Text>
            </Button>
          )}

          {/* Sub-diagram navigation (drill-down into child diagrams / L3/L4 views) */}
          {showSubDiagrams && (
            <>
              <Separator />
              <div className={sectionLabelVariants()}>
                <Text size="xs" weight="medium" color="inherit" uppercase>
                  Sub-Diagramme
                </Text>
              </div>
              {childDiagrams?.map((child) => (
                <Button
                  key={child.key}
                  variant="menu-primary"
                  size="none"
                  onClick={(e) => handleNavigate(e, child.key)}
                >
                  <div className={menuItemTextVariants()}>
                    <Text as="span" size="sm" weight="medium">
                      {child.name}
                    </Text>
                    {child.isDefault && (
                      <Text as="span" size="xs" color="primary" weight="normal">
                        {' '}(Default)
                      </Text>
                    )}
                  </div>
                  <div className="block">
                    <Text size="xs" color="muted">
                      {childLevelLabel(child.level)}
                    </Text>
                  </div>
                </Button>
              ))}
              {canOpenComponentView && !hasAnyChild && (
                <Button
                  variant="menu-primary"
                  size="none"
                  onClick={(e) => handleOpenDerived(e, 'component')}
                >
                  <div className={truncateVariants()}>
                    <Text size="sm" weight="medium">Component-View anzeigen (L3)</Text>
                  </div>
                </Button>
              )}
              {canOpenModuleView && !hasModuleChild && (
                <Button
                  variant="menu-primary"
                  size="none"
                  onClick={(e) => handleOpenDerived(e, 'module')}
                >
                  <div className={truncateVariants()}>
                    <Text size="sm" weight="medium">Module anzeigen (L4)</Text>
                  </div>
                </Button>
              )}
            </>
          )}

          {/* Actions: Copy ID + Delete */}
          <Separator />
          {!confirmingDelete ? (
            <>
              <Button
                variant="menu"
                size="none"
                onClick={handleCopyId}
              >
                <Text size="sm" color={copyFeedback ? 'success' : undefined}>
                  {copyFeedback ? '✓ Kopiert!' : '📋 ID kopieren'}
                </Text>
              </Button>
              <Button
                variant="menu-danger"
                size="none"
                onClick={handleDeleteClick}
              >
                <div className={dangerTextVariants()}>
                  <Text size="sm" color="inherit">🗑 Löschen</Text>
                </div>
              </Button>
            </>
          ) : (
            <div style={{ padding: '8px 12px' }}>
              <div className={dangerConfirmVariants()}>
                <Text size="sm" weight="medium" color="inherit">
                  „{name}“ wirklich löschen?
                </Text>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="menu-cancel"
                  size="none"
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                >
                  Abbrechen
                </Button>
                <Button
                  variant="menu-submit"
                  size="none"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? 'Lösche...' : 'Ja, löschen'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>,
    document.body,
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Label for a child diagram level – Level 2/3/4/DB follow `child.level`. */
function childLevelLabel(level: ChildDiagram['level']): string {
  switch (level) {
    case 'module':
      return 'Level 4 – Module Diagram';
    case 'container':
      return 'Level 2 – Container Diagram';
    case 'dataModel':
      return 'DB – ER Diagram';
    default:
      return 'Level 3 – Component Diagram';
  }
}
