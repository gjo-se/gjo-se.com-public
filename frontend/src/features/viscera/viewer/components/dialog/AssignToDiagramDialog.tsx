import { cva } from 'class-variance-authority';
import { useCallback, useMemo, useState } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Checkbox from '@src/components/primitives/Checkbox/Checkbox';
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';
import Text from '@src/components/primitives/Text/Text';
import type { Diagram } from '@src/features/viscera/core/workspaceSchema';

import { useExistingNodeCandidates } from '../../hooks/useExistingNodeCandidates';

const candidateScrollVariants = cva('max-h-dialog-compact overflow-y-auto');
const truncateVariants = cva('truncate');
const errorBoxVariants = cva(
  'rounded-md border border-red-300 bg-red-50 p-2 dark:border-red-800 dark:bg-red-950',
);

// ── Props ────────────────────────────────────────────────────────────────────

export interface AssignToDiagramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Active diagram — candidates derive from its type + parent (#2269). */
  diagram: Diagram | null;
  /** Called with the selected node IDs on confirm. */
  onAssign: (objectIds: string[]) => void | Promise<void>;
  /** Whether a request is currently in flight. */
  isSubmitting?: boolean;
  /** Server error message to display. */
  error?: string | null;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Dialog to assign existing nodes to the active diagram (diagram-centric,
 * Finding 7, #2269). Candidates = `selectDiagramNodeIds(diagram)` minus the IDs
 * already present in the diagram's nodes map (via `useExistingNodeCandidates`).
 */
export default function AssignToDiagramDialog({
  open,
  onOpenChange,
  diagram,
  onAssign,
  isSubmitting = false,
  error,
}: AssignToDiagramDialogProps) {
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  const candidates = useExistingNodeCandidates(diagram);

  const canSubmit = useMemo(
    () => selectedNodeIds.size > 0 && !isSubmitting,
    [selectedNodeIds, isSubmitting],
  );

  const toggleNode = useCallback((nodeId: string) => {
    setSelectedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedNodeIds(new Set(candidates.map((c) => c.id)));
  }, [candidates]);

  const deselectAll = useCallback(() => {
    setSelectedNodeIds(new Set());
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!canSubmit) return;
    await onAssign([...selectedNodeIds]);
  }, [canSubmit, selectedNodeIds, onAssign]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setSelectedNodeIds(new Set());
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {diagram ? `Nodes zu ${diagram.name} hinzufügen` : 'Nodes hinzufügen'}
          </DialogTitle>
          <DialogDescription>
            Wähle Nodes aus, die noch nicht im Diagramm enthalten sind.
          </DialogDescription>
        </DialogHeader>

        {/* Node selection */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Text as="span" size="sm" weight="semibold">
              Passende Nodes
            </Text>
            <div className="flex gap-2">
              <Button variant="outline" size="xs" onClick={selectAll}>
                Alle
              </Button>
              <Button variant="outline" size="xs" onClick={deselectAll}>
                Keine
              </Button>
            </div>
          </div>

          <div className={candidateScrollVariants()}>
            {candidates.length === 0 && (
              <div className="px-3 py-4">
                <Text size="sm" color="muted" align="center">
                  Keine passenden Nodes verfügbar
                </Text>
              </div>
            )}
            {candidates.map(({ id, name }) => {
              const isSelected = selectedNodeIds.has(id);
              return (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggleNode(id)}
                    disabled={isSubmitting}
                  />
                  <div className={truncateVariants()}>
                    <Text as="span" size="sm" weight="medium">
                      {name}
                    </Text>
                  </div>
                  <div className="ml-auto">
                    <Text size="xs" color="muted">
                      {id}
                    </Text>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={errorBoxVariants()}>
            <Text size="sm" color="error">
              {error}
            </Text>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit}>
            {isSubmitting ? 'Hinzufügen…' : `${selectedNodeIds.size} Nodes hinzufügen`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
