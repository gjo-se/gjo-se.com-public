import { cva } from 'class-variance-authority';
import { memo, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import Text from '@src/components/primitives/Text/Text';
import type { ModuleFilterAction } from '@src/features/viscera/store/modulesSlice';
import { useContextMenuOpen } from '@src/features/viscera/viewer/hooks/useContextMenuOpen';

import FileNodeContextMenu from './FileNodeContextMenu';
import NodeEdgeHandles from './NodeEdgeHandles';

import type { FileNodeContextMenuHandle } from './FileNodeContextMenu';
import type { NodeProps } from '@xyflow/react';

// ── Node Data ───────────────────────────────────────────────────────────────

interface FileNodeData {
  /** Dotted module path = stable node id. */
  name: string;
  /** Display: last segment (e.g. 'client.py'). */
  fileName: string;
  /** Repo path for the clipboard. */
  path: string;
  /** Optional curated node description (persistence in a follow-up ticket). */
  description?: string;
  dimmed?: boolean;
  hidden?: boolean;
  /** Store-free callback: dispatches a module filter action (context menu). */
  onModuleFilter?: (action: ModuleFilterAction, moduleName: string) => void;
  /** Whether the module is currently collapsed (context menu label). */
  collapsed?: boolean;
}

type FileNodeProps = NodeProps & { data: FileNodeData };

const CLIPBOARD_ERROR_MESSAGE = 'Pfad konnte nicht kopiert werden';

const cardVariants = cva(
  'flex h-full w-full flex-col justify-center overflow-hidden rounded border border-gray-300 bg-white px-2 py-1 shadow-sm hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-500',
);
const truncateVariants = cva('truncate');
const descriptionVariants = cva('truncate text-2xs text-gray-500');

// ── Component ───────────────────────────────────────────────────────────────

function FileNode({ data }: FileNodeProps) {
  const { name, fileName, path, description, dimmed, hidden, onModuleFilter, collapsed } = data;

  const handleClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(path);
      toast.success(`Pfad kopiert: ${path}`);
    } catch {
      toast.error(CLIPBOARD_ERROR_MESSAGE);
    }
  }, [path]);

  // ── Context menu ─────────────────────────────────────────────────────────
  const contextMenuRef = useRef<FileNodeContextMenuHandle>(null);
  const handleContextMenu = useContextMenuOpen(contextMenuRef);

  if (hidden) return null;

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={path}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      className={cardVariants()}
      style={{ opacity: dimmed ? 0.3 : 1, cursor: 'pointer' }}
    >
      <div className={truncateVariants()}>
        <Text as="span" mono size="xs" color="on-surface">
          {fileName}
        </Text>
      </div>
      {description && (
        <div className={descriptionVariants()}>
          {description}
        </div>
      )}

      {/* Edge Handles – L4-Import-Kanten (straight) benötigen source/target (Muster CardNode). */}
      <NodeEdgeHandles />

      {/* Context Menu (L4-Modul-Interaktion) */}
      {onModuleFilter && (
        <FileNodeContextMenu
          ref={contextMenuRef}
          nodeId={name}
          collapsed={collapsed}
          onAction={onModuleFilter}
        />
      )}
    </div>
  );
}

export default memo(FileNode);
