import {
  CYLINDER_ELLIPSE_HEIGHT,
  SYSTEM_HEADER_HEIGHT,
  UML_COMPONENT_ICON_X,
  UML_COMPONENT_ICON_Y,
  UML_COMPONENT_RECT_W,
  UML_COMPONENT_RECT_H,
  UML_COMPONENT_RECT_GAP,
} from '../../utils/cardShape';

import type { CardBackgroundProps } from '../../utils/cardShape';

// ── Props ───────────────────────────────────────────────────────────────────

interface ShapeRenderProps {
  kind: CardBackgroundProps['kind'];
  width: number;
  height: number;
  rx: number;
  ry: number;
  strokeDasharray?: string;
  strokeWidth: number;
  /** Tailwind fill/stroke-Klassen der Basis (deckend). */
  fillClass?: string;
  strokeClass?: string;
  /** Inline-Style für den Status-Stroke auf der Basis. */
  strokeStyle?: React.CSSProperties;
  /** Inline-Fill für das Status-Tint-Overlay. */
  fill?: string;
  fillOpacity?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders die Kind-spezifische Geometrie einmal. Wird zweimal aufgerufen:
 * einmal als deckende Basis (fillClass/strokeClass), einmal als Status-Tint-
 * Overlay (fill/fillOpacity). `fill` und `fillClass` schließen sich gegenseitig
 * aus; `fill` (inline) gewinnt.
 */
export default function CardKindShape({
  kind,
  width,
  height,
  rx,
  ry,
  strokeDasharray,
  strokeWidth,
  fillClass,
  strokeClass,
  strokeStyle,
  fill,
  fillOpacity = 1,
}: ShapeRenderProps) {
  const className = [fillClass, strokeClass].filter(Boolean).join(' ') || undefined;
  const shapeStyle = fill ? { fill, fillOpacity, ...strokeStyle } : strokeStyle;

  if (kind === 'system') {
    return (
      <>
        {/* Header bar — distinct top edge for system cards */}
        <rect
          x={0}
          y={0}
          width={width}
          height={SYSTEM_HEADER_HEIGHT}
          rx={rx}
          className={className}
          style={shapeStyle}
          strokeWidth={strokeWidth}
        />
        {/* Body — starts below header, no top rounding */}
        <rect
          x={0}
          y={SYSTEM_HEADER_HEIGHT}
          width={width}
          height={height - SYSTEM_HEADER_HEIGHT}
          className={className}
          style={shapeStyle}
          strokeWidth={strokeWidth}
        />
      </>
    );
  }

  if (kind === 'store') {
    const cy = CYLINDER_ELLIPSE_HEIGHT;
    return (
      <>
        {/* Cylinder body: top arc (hidden by lid) + sides + bottom arc */}
        <path
          d={[
            `M 0,${cy}`,
            `A ${width / 2},${cy} 0 0,0 ${width},${cy}`,  // top arc
            `L ${width},${height - cy}`,                      // right side
            `A ${width / 2},${cy} 0 0,1 0,${height - cy}`,  // bottom arc
            'Z',
          ].join(' ')}
          className={className}
          style={shapeStyle}
          strokeWidth={strokeWidth}
        />
        {/* Top ellipse ("lid") — slightly different fill for depth */}
        <ellipse
          cx={width / 2}
          cy={cy}
          rx={width / 2}
          ry={cy}
          className={fill ? undefined : 'fill-gray-100 dark:fill-gray-700'}
          style={fill ? { fill, fillOpacity, ...strokeStyle } : strokeStyle}
          strokeWidth={strokeWidth}
        />
      </>
    );
  }

  if (kind === 'person') {
    return (
      <>
        {/* Bottom half — standard card rect */}
        <rect
          x={0}
          y={50}
          width={width}
          height={50}
          rx={rx}
          ry={ry}
          className={className}
          style={shapeStyle}
          strokeWidth={strokeWidth}
        />
        {/* Top half — person figure, no background */}
        <g transform={`translate(${width / 2 - 14}, 6)`}>
          <circle cx="14" cy="12" r="10" fill="currentColor" opacity={0.8} />
          <path
            d="M6,46 C6,34 10,28 14,28 C18,28 22,34 22,46"
            stroke="currentColor"
            strokeWidth={1.5}
            fill="none"
            opacity={0.8}
          />
        </g>
      </>
    );
  }

  return (
    <>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={rx}
        ry={ry}
        className={className}
        style={shapeStyle}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
      />
      {kind === 'component' && (
        <g transform={`translate(${UML_COMPONENT_ICON_X}, ${UML_COMPONENT_ICON_Y})`}>
          <rect
            x={0}
            y={0}
            width={UML_COMPONENT_RECT_W}
            height={UML_COMPONENT_RECT_H}
            rx={1}
            fill="currentColor"
            opacity={0.4}
          />
          <rect
            x={0}
            y={UML_COMPONENT_RECT_H + UML_COMPONENT_RECT_GAP}
            width={UML_COMPONENT_RECT_W}
            height={UML_COMPONENT_RECT_H}
            rx={1}
            fill="currentColor"
            opacity={0.4}
          />
        </g>
      )}
    </>
  );
}
