import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { Panel, useReactFlow, type XYPosition } from '@xyflow/react';
import { cva } from 'class-variance-authority';
import { useCallback, useState } from 'react';

import Icon from '@src/components/primitives/Icon/Icon';
import Popover from '@src/components/primitives/Popover/Popover';
import PopoverContent from '@src/components/primitives/Popover/PopoverContent';
import Toggle from '@src/components/primitives/Toggle/Toggle';
import { getCardKind, NODE_TYPE_BY_KIND } from '@src/features/viscera/core/cardKindRegistry';
import { CARD } from '@src/features/viscera/core/nodeDimensions';
import type { Diagram, ModelObjectType } from '@src/features/viscera/core/workspaceSchema';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { useExistingNodeCandidates } from '../../hooks/useExistingNodeCandidates';

import CandidateNodeList from './CandidateNodeList';
import GroupCreateSection from './GroupCreateSection';
import TypeMenuItems from './TypeMenuItems';

import type { GroupCreateOutcome } from '../../hooks/useViewerActions';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AddNodeOverlayProps {
  /** Called when the user confirms the name in the placeholder node (Enter key). */
  onConfirmPlaceholder: (
    tempId: string,
    name: string,
    opts?: { sourceNodeId?: string },
  ) => Promise<Record<string, unknown> | null>;
  /** Called when the user cancels the placeholder node (Escape or × button). */
  onCancelPlaceholder: (tempId: string) => void;
  /** Active diagram — provides the candidate scope for the "existing node" section. */
  diagram?: Diagram | null;
  /** Assigns existing node IDs to the active diagram (persists in the nodes map). */
  onAssignExistingNode?: (objectIds: string[]) => void;
  /** Creates a new group from the "Neue Group" section (#2276). */
  onCreateGroup?: (name: string, position: XYPosition) => Promise<GroupCreateOutcome>;
  disabled?: boolean;
}

// ── Section Switcher ──────────────────────────────────────────────────────────

type OverlaySection = 'new' | 'existing';

const panelVariants = cva(
  'bg-background/80 backdrop-blur-sm border shadow-lg rounded-lg w-64',
);

const SECTION_TABS: { section: OverlaySection; label: string }[] = [
  { section: 'new', label: 'Neu erstellen' },
  { section: 'existing', label: 'Vorhandener Node' },
];

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Canvas overlay showing a prominent ＋ button at the bottom-center of the ReactFlow viewport.
 * On click, opens a compact Popover with two sections:
 *
 * - „Neu erstellen": type options (System, Container, Component, Store, Person).
 *   Type selection creates a CardNode in editing mode with an inline name input.
 *   The API call happens only when the user presses Enter to confirm the name.
 *   Additionally offers „Neue Group" (#2276) with an inline name input that
 *   creates a group entity (empty boundary at canvas center).
 * - „Vorhandener Node": candidate list of existing nodes that fit the active diagram
 *   (Finding 7, #2268). Selecting one assigns it to the diagram immediately.
 */
export default function AddNodeOverlay(
  {
    onConfirmPlaceholder,
    onCancelPlaceholder,
    diagram = null,
    onAssignExistingNode,
    onCreateGroup,
    disabled = false,
  }: AddNodeOverlayProps,
) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<OverlaySection>('new');
  const { addNodes, screenToFlowPosition, setNodes } = useReactFlow();

  const candidates = useExistingNodeCandidates(diagram ?? null);
  const showExistingSection = Boolean(diagram && onAssignExistingNode);

  const handleTypeSelect = useCallback(
    (type: ModelObjectType) => {
      const tempId = crypto.randomUUID();
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      const kind = getCardKind(type);

      addNodes([
        {
          id: tempId,
          type: NODE_TYPE_BY_KIND[kind],
          position,
          data: {
            name: '',
            kind,
            cardWidth: CARD.width,
            cardHeight: CARD.height,
            isEditing: true,
            editingLabel: `New ${typeLabel(type)}`,
            onConfirmEdit: async (name: string) => {
              const result = await onConfirmPlaceholder(tempId, name);
              if (!result) {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === tempId
                      ? { ...n, data: { ...(n.data as Record<string, unknown>), editingError: 'Fehler beim Speichern' } }
                      : n,
                  ),
                );
                return;
              }
              setNodes((nds) =>
                nds.map((n) => {
                  if (n.id !== tempId) return n;
                  return {
                    ...n,
                    data: { ...(n.data as Record<string, unknown>), name, isEditing: false },
                  };
                }),
              );
            },
            onCancelEdit: () => {
              setNodes((nds) => nds.filter((n) => n.id !== tempId));
              onCancelPlaceholder(tempId);
            },
          },
        },
      ]);

      useVisceraStore.getState().addOptimisticNode({ tempId, type, position });
      setOpen(false);
    },
    [addNodes, screenToFlowPosition, setNodes, onConfirmPlaceholder, onCancelPlaceholder],
  );

  const handleCandidateSelect = useCallback(
    (id: string) => {
      onAssignExistingNode?.([id]);
      setOpen(false);
    },
    [onAssignExistingNode],
  );

  return (
    <Panel position="bottom-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger
          disabled={disabled}
          className="h-14 w-14 rounded-full bg-primary/80 text-primary-foreground
            shadow-lg backdrop-blur-sm hover:bg-primary transition-colors
            data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed
            inline-flex items-center justify-center
            [&_svg]:text-primary-foreground"
        >
          <Icon name="plus-circle" size="md" />
        </PopoverPrimitive.Trigger>
        <PopoverContent side="top" sideOffset={12}>
          <div className={panelVariants()}>
            {showExistingSection && (
              <div className="flex gap-1 p-1">
                {SECTION_TABS.map(({ section: tab, label }) => (
                  <Toggle
                    key={tab}
                    variant="outline"
                    size="sm"
                    pressed={section === tab}
                    onPressedChange={() => setSection(tab)}
                  >
                    {label}
                  </Toggle>
                ))}
              </div>
            )}
            {section === 'existing' && showExistingSection ? (
              <CandidateNodeList
                candidates={candidates}
                onSelect={handleCandidateSelect}
                disabled={disabled}
              />
            ) : (
              <div className="py-1">
                <TypeMenuItems onSelect={handleTypeSelect} />
                {onCreateGroup && (
                  <GroupCreateSection
                    onCreateGroup={onCreateGroup}
                    onSuccess={() => setOpen(false)}
                  />
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </Panel>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeLabel(type: ModelObjectType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
