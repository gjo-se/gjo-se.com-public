import { useCallback, useEffect, useState } from 'react';

import type { EdgeLine, NormalizedModelObject } from '../../utils/modelViewerTypes';

// ── Types ────────────────────────────────────────────────────────────────────

interface LineCoords {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// ── Pure Function ─────────────────────────────────────────────────────────────

interface ModelViewerLinesProps {
  objects: NormalizedModelObject[];
  edges: EdgeLine[];
  onEdgeClick: (from: string, to: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

// ── Props ─────────────────────────────────────────────────────────────────────

function computeLines(
  objects: NormalizedModelObject[],
  edges: EdgeLine[],
  containerEl: HTMLElement | null,
): LineCoords[] {
  if (!containerEl) return [];

  const lines: LineCoords[] = [];
  const objectIds = new Set(objects.map((o) => o.id));

  edges.forEach((edge) => {
    if (!objectIds.has(edge.from) || !objectIds.has(edge.to)) return;

    const fromEl = containerEl.querySelector(`[data-object-id="${CSS.escape(edge.from)}"]`);
    const toEl = containerEl.querySelector(`[data-object-id="${CSS.escape(edge.to)}"]`);
    if (!fromEl || !toEl) return;

    const containerRect = containerEl.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    lines.push({
      from: edge.from,
      to: edge.to,
      x1: fromRect.left - containerRect.left + fromRect.width / 2,
      y1: fromRect.top - containerRect.top + fromRect.height / 2,
      x2: toRect.left - containerRect.left + toRect.width / 2,
      y2: toRect.top - containerRect.top + toRect.height / 2,
    });
  });

  return lines;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * SVG-Overlay-Komponente für Edge-Linien zwischen Model-Cards.
 *
 * - Reagiert auf Window-Resize
 * - Transparente Hit-Area (strokeWidth 12) für Klick-Navigation
 * - Sichtbare gestrichelte Linien (strokeDasharray 4 3)
 */
export default function ModelViewerLines({
  objects,
  edges,
  onEdgeClick,
  containerRef,
}: ModelViewerLinesProps) {
  const [lines, setLines] = useState<LineCoords[]>([]);

  const updateLines = useCallback(() => {
    setLines(computeLines(objects, edges, containerRef.current));
  }, [objects, edges, containerRef]);

  useEffect(() => {
    updateLines();
  }, [updateLines]);

  useEffect(() => {
    const onResize = () => updateLines();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateLines]);

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 1 }}
    >
      {lines.map((line) => (
        <g key={`${line.from}-${line.to}`}>
          {/* Invisible wider hit area for click */}
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="transparent"
            strokeWidth={12}
            className="cursor-pointer"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => {
              e.stopPropagation();
              onEdgeClick(line.from, line.to);
            }}
          />
          {/* Visible line */}
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.6}
          />
        </g>
      ))}
    </svg>
  );
}
