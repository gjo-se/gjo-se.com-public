/**
 * VisceraDndContext – @dnd-kit context for card dragging on the canvas (#2294).
 *
 * React Flow renders only (``nodesDraggable=false``); cards move via
 * ``useDraggable`` in CardNode. This context follows the FBF dedup pattern
 * (DndContext + PointerSensor with distance activation).
 *
 * The dragged node is moved live: ``dragMove`` writes the absolute flow
 * position into ``store.nodeOverrides`` (grid-snapped) so the node and its
 * edges follow the pointer in real time. ``dragEnd`` finalizes the move
 * (MoveNodeCommand + sync queue), ``dragCancel`` restores the start position.
 *
 * Group drags (#2295): moving a group also moves its members — member
 * overrides are shifted by the same snapped delta live and persisted on
 * drop so relative positions inside the group stay stable.
 *
 * Group drop zones (#2295): GroupNode registers ``useDroppable`` targets;
 * ``dragStart`` remembers the card's origin group, ``dragEnd`` evaluates
 * ``over`` (GroupDropData) and delegates to the group commands
 * (assignToGroup / unassignFromGroup).
 */

import { DndContext, PointerSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';
import { useReactFlow } from '@xyflow/react';
import { useCallback, useRef } from 'react';

import { overrideKey } from '../../../core/nodeOverrides';
import { useWorkspace } from '../../../core/useWorkspace';
import { useVisceraStore } from '../../../store/visceraStore';
import { assignToGroup } from '../../services/assignToGroup';
import { unassignFromGroup } from '../../services/unassignFromGroup';
import { useHelperLinesStore } from '../../store/helperLinesStore';
import { applyNodeMove, snapToGrid } from '../../utils/applyNodeMove';
import { computeHelperLines } from '../../utils/helperLines';

import type { OverridePosition } from '../../../core/nodeOverrides';
import type { NodeBounds } from '../../../store/diagramSlice';
import type { VisceraDragData, GroupDropData, VisceraDndCommandContext } from '../../utils/dndTypes';
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core';
import type { XYPosition } from '@xyflow/react';

// ── Types ───────────────────────────────────────────────────────────────────

interface DragStartSnapshot {
  nodeId: string;
  /** 'card' runs the group commands on drop; 'group' moves the boundary. */
  dragType: 'card' | 'group';
  /** Absolute flow position of the node at drag start. */
  flowPosition: XYPosition;
  /** Screen-Position des Mauszeigers beim DragStart (clientX/Y) — Basis für die
      robuste Drag-Delta-Berechnung (#2523). */
  mouseStart: XYPosition;
  zoom: number;
  /** Group the card belonged to at drag start (workspace.groups members). */
  originGroupId: string | null;
  /** Pre-drag override position — undo/cancel restore target. */
  previousOverride: OverridePosition | undefined;
  /** Group bounds in flow units — persisted on group moves (#2293). */
  bounds: NodeBounds | undefined;
  /** Members moved along with a group drag. */
  members: MemberSnapshot[];
  /** Flow-Box der gezogenen Card (für Hilfslinien-Alignment). */
  nodeBox: { width: number; height: number };
  /** Flow-Boxen aller übrigen Nodes (für Hilfslinien-Alignment). */
  others: { left: number; top: number; width: number; height: number }[];
}

interface MemberSnapshot {
  nodeId: string;
  /** Absolute flow position of the member at group drag start (DOM-measured). */
  startAbsolute: XYPosition;
  /** Pre-drag override of the member — undo/cancel restore target. */
  previousOverride: OverridePosition | undefined;
}

export interface VisceraDndContextProps {
  /** Key of the active diagram — positions are persisted per diagram (#2229). */
  diagramKey: string;
  /** Hook VOR dem Persist (Materialisierung des derived-Diagramms, #2491). */
  onBeforePersist?: (diagramKey: string) => void;
  children: React.ReactNode;
}

/** Commands evaluated in priority order — first match wins. */
const COMMANDS = [assignToGroup, unassignFromGroup];

// ── Component ───────────────────────────────────────────────────────────────

/** Context provider that enables @dnd-kit card dragging on the Viscera canvas. */
export default function VisceraDndContext({
  diagramKey,
  onBeforePersist,
  children,
}: VisceraDndContextProps) {
  const { getZoom, screenToFlowPosition } = useReactFlow();
  const { workspace, updateWorkspace } = useWorkspace();
  const dragStartRef = useRef<DragStartSnapshot | null>(null);
  // Aktuelle Maus-Screen-Position während des Drags (via window pointermove).
  // Dient als robuste Delta-Quelle statt dnd-kit's `event.delta`, das durch das
  // Live-Move der Card (nodeOverrides → Re-Render) korrumpiert wird (#2523).
  const mouseRef = useRef<XYPosition | null>(null);

  const handleWindowPointerMove = useCallback((e: PointerEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const dragData = event.active.data.current as VisceraDragData | undefined;
    if (!dragData) return;

    // Start-Maus-Screen-Position: das native PointerEvent, das den Drag aktivierte.
    const activator = event.activatorEvent as PointerEvent | undefined;
    const mouseStart: XYPosition = {
      x: activator?.clientX ?? 0,
      y: activator?.clientY ?? 0,
    };
    mouseRef.current = mouseStart;
    window.addEventListener('pointermove', handleWindowPointerMove);

    // Measure the node's current on-screen position from the rendered
    // React Flow node. ``event.active.rect.current.initial`` is unreliable
    // here (null on synthetic pointer flows) — the DOM rect always reflects
    // the real position including pan/zoom transforms.
    const nodeId = String(event.active.id);
    const nodeElement = Array.from(document.querySelectorAll('.react-flow__node')).find(
      (el) => el.getAttribute('data-id') === nodeId,
    ) as HTMLElement | undefined;
    if (!nodeElement) return;

    const rect = nodeElement.getBoundingClientRect();
    const zoom = getZoom() || 1;
    const dragType = dragData.dndType;
    const originGroupId =
      dragType === 'card'
        ? workspace?.groups?.find((g) => (g.members ?? []).includes(nodeId))?.id ?? null
        : null;
    const compositeKey = overrideKey(diagramKey, nodeId);
    const store = useVisceraStore.getState();
    const previousOverride = store.nodeOverrides[compositeKey];
    const bounds = dragType === 'group'
      ? { width: dragData.width, height: dragData.height }
      : undefined;

    // ── Hilfslinien: Flow-Boxen aller übrigen Nodes beim DragStart snappen ──
    const others = Array.from(document.querySelectorAll('.react-flow__node'))
      .filter((el) => el.getAttribute('data-id') !== nodeId)
      .map((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        const origin = screenToFlowPosition({ x: r.left, y: r.top });
        return {
          left: origin.x,
          top: origin.y,
          width: r.width / zoom,
          height: r.height / zoom,
        };
      });

    // ── Group drag: snapshot every rendered member so it can move along ────
    const members: MemberSnapshot[] = [];
    if (dragType === 'group') {
      const memberIds =
        workspace?.groups?.find((g) => g.id === nodeId)?.members ?? [];
      memberIds.forEach((memberId) => {
        const memberElement = Array.from(document.querySelectorAll('.react-flow__node')).find(
          (el) => el.getAttribute('data-id') === memberId,
        ) as HTMLElement | undefined;
        if (!memberElement) return;
        const memberRect = memberElement.getBoundingClientRect();
        const memberKey = overrideKey(diagramKey, memberId);
        members.push({
          nodeId: memberId,
          startAbsolute: screenToFlowPosition({
            x: memberRect.left,
            y: memberRect.top,
          }),
          previousOverride: store.nodeOverrides[memberKey],
        });
      });
    }

    dragStartRef.current = {
      nodeId,
      dragType,
      flowPosition: screenToFlowPosition({ x: rect.left, y: rect.top }),
      mouseStart,
      zoom,
      originGroupId,
      previousOverride,
      bounds,
      members,
      nodeBox: { width: rect.width / zoom, height: rect.height / zoom },
      others,
    };
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const start = dragStartRef.current;
    if (!start) return;

    // Live preview: move the real node (and its edges) in grid steps while
    // dragging. The final position at drag end is identical — no jump.
    //
    // Robustes Delta über die MAUS-Screen-Position relativ zum DragStart statt
    // dnd-kit's `event.delta`: Letzteres wird durch das Live-Move der Card
    // (nodeOverrides → Card re-rendert → dnd-kit misst die Position neu) bei
    // jedem Move korrumpiert und oszilliert → die Card springt (#2523).
    const mouse = mouseRef.current;
    const delta = mouse
      ? { x: mouse.x - start.mouseStart.x, y: mouse.y - start.mouseStart.y }
      : event.delta;
    const raw = {
      x: start.flowPosition.x + delta.x / start.zoom,
      y: start.flowPosition.y + delta.y / start.zoom,
    };
    const position = { x: snapToGrid(raw.x), y: snapToGrid(raw.y) };

    // Hilfslinien: REIN optisch — sie verändern die Position NICHT. Das
    // Overlay liest aus dem separaten helperLinesStore (re-rendert nur das
    // Overlay), damit der Card-Move unberührt bleibt (#2523).
    // Berechnung auf der GESNAPPTEN Position (position) statt der Maus (raw):
    // Die Card springt im Raster, der angezeigte Kantenabstand muss zum
    // tatsächlich gerenderten Stand passen.
    if (start.dragType === 'card') {
      const lines = computeHelperLines(
        { left: position.x, top: position.y, ...start.nodeBox },
        start.others,
      );
      const hasLines = lines.x !== undefined || lines.y !== undefined;
      useHelperLinesStore.getState().setLines(hasLines ? lines : null);
    } else {
      useHelperLinesStore.getState().setLines(null);
    }

    const shift = { x: position.x - start.flowPosition.x, y: position.y - start.flowPosition.y };
    const key = overrideKey(diagramKey, start.nodeId);
    const store = useVisceraStore.getState();
    const nextOverrides = { ...store.nodeOverrides, [key]: position };

    // Group drag: keep members at their relative offset inside the group.
    start.members.forEach((member) => {
      const memberKey = overrideKey(diagramKey, member.nodeId);
      nextOverrides[memberKey] = {
        x: snapToGrid(member.startAbsolute.x + shift.x),
        y: snapToGrid(member.startAbsolute.y + shift.y),
      };
    });

    useVisceraStore.setState({ nodeOverrides: nextOverrides });
  };

  const handleDragCancel = () => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    window.removeEventListener('pointermove', handleWindowPointerMove);
    mouseRef.current = null;
    useHelperLinesStore.getState().setLines(null);
    if (!start) return;

    // Restore the pre-drag position — live preview moves are reverted.
    const store = useVisceraStore.getState();
    const restored = { ...store.nodeOverrides };
    const key = overrideKey(diagramKey, start.nodeId);
    if (start.previousOverride) {
      restored[key] = start.previousOverride;
    } else {
      delete restored[key];
    }
    start.members.forEach((member) => {
      const memberKey = overrideKey(diagramKey, member.nodeId);
      if (member.previousOverride) {
        restored[memberKey] = member.previousOverride;
      } else {
        delete restored[memberKey];
      }
    });
    useVisceraStore.setState({ nodeOverrides: restored });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    // Mausposition VOR dem Aufräumen sichern (TS: nicht durch null-Zuweisung verengt).
    const finalMouse = mouseRef.current;
    window.removeEventListener('pointermove', handleWindowPointerMove);
    mouseRef.current = null;
    useHelperLinesStore.getState().setLines(null);
    if (!start) return;

    // ── Group drop zones (#2295) — cards only, groups cannot be nested ────
    if (start.dragType === 'card') {
      const overData = event.over?.data.current as GroupDropData | undefined;
      const targetGroupId = overData?.kind === 'group' ? overData.groupId : null;

      const ctx: VisceraDndCommandContext = {
        nodeId: start.nodeId,
        originGroupId: start.originGroupId,
        targetGroupId,
        workspace,
        updateWorkspace,
      };

      const command = COMMANDS.find((c) => c.canExecute(ctx));
      command?.execute(ctx);
    }

    // ── Position move (#2294/#2293) — finalize with the pre-drag undo source ─
    // Endposition aus der Maus-Screen-Position (konsistent mit dem Live-Move,
    // kein Sprung beim Loslassen, #2523).
    const delta = finalMouse
      ? { x: finalMouse.x - start.mouseStart.x, y: finalMouse.y - start.mouseStart.y }
      : event.delta;
    const endPosition = {
      x: start.flowPosition.x + delta.x / start.zoom,
      y: start.flowPosition.y + delta.y / start.zoom,
    };
    const snappedEnd = {
      x: snapToGrid(endPosition.x),
      y: snapToGrid(endPosition.y),
    };
    applyNodeMove(start.nodeId, endPosition, diagramKey, start.previousOverride, start.bounds, onBeforePersist);

    // Group drag: persist every member moved along with the group.
    const shift = { x: snappedEnd.x - start.flowPosition.x, y: snappedEnd.y - start.flowPosition.y };
    start.members.forEach((member) => {
      applyNodeMove(
        member.nodeId,
        { x: member.startAbsolute.x + shift.x, y: member.startAbsolute.y + shift.y },
        diagramKey,
        member.previousOverride,
        undefined,
        onBeforePersist,
      );
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
}
