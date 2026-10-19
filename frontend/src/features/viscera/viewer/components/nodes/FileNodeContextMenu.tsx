import { useCallback, useImperativeHandle, useState } from 'react';
import { createPortal } from 'react-dom';

import Button from '@src/components/primitives/Button/Button';
import Card from '@src/components/primitives/Card/Card';
import Separator from '@src/components/primitives/Separator/Separator';
import Text from '@src/components/primitives/Text/Text';
import type { ModuleFilterAction } from '@src/features/viscera/store/modulesSlice';
import { useCloseOnEscape } from '@src/features/viscera/viewer/hooks/useCloseOnEscape';
import { contextMenuPanelStyle } from '@src/features/viscera/viewer/utils/contextMenu';

import type { MouseEvent, Ref } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FileMenuPosition {
  x: number;
  y: number;
}

/** Imperative handle: `FileNode` opens the menu from its `onContextMenu`. */
export interface FileNodeContextMenuHandle {
  /** Opens the menu at the given viewport coordinates. */
  open: (x: number, y: number) => void;
}

interface FileNodeContextMenuProps {
  ref?: Ref<FileNodeContextMenuHandle>;
  /** Dotted module path = node id. */
  nodeId: string;
  /** Whether the module is currently collapsed (drives the Collapse/Expand label). */
  collapsed?: boolean;
  /** Store-free callback: dispatches the chosen module filter action. */
  onAction?: (action: ModuleFilterAction, moduleName: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * L4 module context menu overlay (portal): Fokus / Reaches / Impact /
 * Collapse-Expand / Reset. Store-frei – alle Aktionen laufen über den
 * `onAction`-Callback (von `VisceraReactFlow` verdrahtet).
 */
export default function FileNodeContextMenu({
  ref,
  nodeId,
  collapsed = false,
  onAction,
}: FileNodeContextMenuProps) {
  const [position, setPosition] = useState<FileMenuPosition | null>(null);

  useImperativeHandle(ref, () => ({
    open: (x: number, y: number) => setPosition({ x, y }),
  }), []);

  const isOpen = position !== null;

  const closeAll = useCallback(() => {
    setPosition(null);
  }, []);

  useCloseOnEscape(isOpen, closeAll);

  const handleAction = useCallback(
    (e: MouseEvent, action: ModuleFilterAction) => {
      e.stopPropagation();
      closeAll();
      onAction?.(action, nodeId);
    },
    [nodeId, onAction, closeAll],
  );

  if (!isOpen) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={closeAll}>
      <div
        style={contextMenuPanelStyle(position.x, position.y, 260)}
        onClick={(e) => e.stopPropagation()}
      >
        <Card size="sm">
          <Button
            variant="menu-primary"
            size="none"
            onClick={(e) => handleAction(e, 'focus')}
          >
            <Text size="sm" weight="medium">◎ Fokus</Text>
          </Button>
          <Button
            variant="menu"
            size="none"
            onClick={(e) => handleAction(e, 'reaches')}
          >
            <Text size="sm">→ Reaches</Text>
          </Button>
          <Button
            variant="menu"
            size="none"
            onClick={(e) => handleAction(e, 'impact')}
          >
            <Text size="sm">← Impact</Text>
          </Button>
          <Separator />
          <Button
            variant="menu"
            size="none"
            onClick={(e) => handleAction(e, 'toggle-collapse')}
          >
            <Text size="sm">{collapsed ? '▸ Expand' : '▾ Collapse'}</Text>
          </Button>
          <Separator />
          <Button
            variant="menu"
            size="none"
            onClick={(e) => handleAction(e, 'reset')}
          >
            <Text size="sm">⟲ Reset</Text>
          </Button>
        </Card>
      </div>
    </div>,
    document.body,
  );
}
