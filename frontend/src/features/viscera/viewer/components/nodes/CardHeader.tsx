import { useState } from 'react';

import Input from '@src/components/primitives/Input/Input';

import { UML_COMPONENT_ICON_TOTAL_W } from '../../utils/cardShape';
import TechIconBadge from '../card/TechIconBadge';

import type { CardKind } from '../../utils/cardShape';
import type { KeyboardEvent } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CardHeaderProps {
  kind: CardKind;
  width: number;
  name: string;
  external: boolean;
  /** Badge-Textfarbe (`text-tag-*-text`) für nicht-Default-Status – sonst undefined. */
  statusTextClass?: string;
  /** First technology slug — rendered as icon badge in the headline. */
  firstTechSlug: string | undefined;
  /** Kurzbeschreibung des Objekts – bis zu 2 Zeilen unter dem Namen (max. 64 Zeichen, sonst nicht gerendert). */
  description?: string;
  /** Editing mode: show inline input instead of static name text. */
  isEditing?: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  /** Called on Enter/Escape inside the inline edit input. */
  onEditKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  editingLabel?: string;
}

// ── Layout ─────────────────────────────────────────────────────────────────────

/** Maximale Description-Länge gesamt (2 Zeilen à max. 32 Zeichen). */
const MAX_DESCRIPTION_LENGTH = 64;
/** Maximale Länge pro Description-Zeile (Kartenbreite 200px, 10px-Font ≈ 32 Zeichen). */
const MAX_DESCRIPTION_LINE = 32;
/** Gemeinsame Kantenlänge für Tech-Icon und externes ↗-Icon (beide gleich groß). */
const ICON_SIZE = 16;
/** Abstand zwischen den Kopfzeilen-Icons und dem Namen. */
const ICON_GAP = 4;

interface HeaderLayout {
  nameFontSize: number;
  nameY: number;
  iconY: number;
  descY1: number;
  descY2: number;
}

const HEADER_LAYOUT: Record<CardKind, HeaderLayout> = {
  system:    { nameFontSize: 14, nameY: 26, iconY: 14, descY1: 44, descY2: 56 },
  person:    { nameFontSize: 13, nameY: 70, iconY: 8,  descY1: 84, descY2: 96 },
  container: { nameFontSize: 13, nameY: 26, iconY: 8,  descY1: 44, descY2: 56 },
  component: { nameFontSize: 13, nameY: 26, iconY: 8,  descY1: 44, descY2: 56 },
  store:     { nameFontSize: 13, nameY: 26, iconY: 8,  descY1: 44, descY2: 56 },
  table:     { nameFontSize: 14, nameY: 28, iconY: 8,  descY1: 44, descY2: 56 },
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * SVG header group of a node card: tech icon badge, optional external ↗ icon,
 * name text (or inline edit input) and up to two description lines.
 */
export default function CardHeader({
  kind,
  width,
  name,
  external,
  statusTextClass,
  firstTechSlug,
  description,
  isEditing,
  editValue,
  onEditValueChange,
  onEditKeyDown,
  editingLabel,
}: CardHeaderProps) {
  const layout = HEADER_LAYOUT[kind];

  const hasTechIcon = firstTechSlug != null;
  const hasExternalIcon = external;

  // Namensbreite messen (getComputedTextLength), um die Kopfzeile als Gruppe
  // [Tech-Icon] [Name] [externes ↗] exakt zu zentrieren.
  const [nameWidth, setNameWidth] = useState(0);
  const nameRef = (node: SVGTextElement | null) => {
    setNameWidth(node?.getComputedTextLength() ?? 0);
  };

  // Kopfzeile konsequent zentriert: Der Name sitzt in der Gruppenmitte, beide
  // Icons (gleiche Größe ICON_SIZE) flankieren ihn und werden vertikal zur
  // Überschrift zentriert (iconY). So sind alle Cards harmonisch ausgerichtet.
  const groupW =
    (hasTechIcon ? ICON_SIZE + ICON_GAP : 0) +
    nameWidth +
    (hasExternalIcon ? ICON_GAP + ICON_SIZE : 0);
  const groupLeft = width / 2 - groupW / 2;

  const nameX = groupLeft + (hasTechIcon ? ICON_SIZE + ICON_GAP : 0) + nameWidth / 2;
  const nameAnchor: 'start' | 'middle' = 'middle';

  // Vertikale Mitte der Überschrift → beide Icons daran zentrieren.
  const iconCenterY = layout.nameY - layout.nameFontSize * 0.35;
  const iconY = iconCenterY - ICON_SIZE / 2;

  const techIconX = hasTechIcon ? groupLeft : 0;
  const techIconY = iconY;

  // Externes ↗-Icon rechts neben dem Namen (nur wenn external).
  const externalIconX = isEditing
    ? width - 8 - ICON_SIZE
    : groupLeft + (hasTechIcon ? ICON_SIZE + ICON_GAP : 0) + nameWidth + ICON_GAP;
  const externalIconY = iconY;

  // Person-Card: Description ist auf 1 Zeile (max. 32 Zeichen) begrenzt, da die
  // Karte oben die Personen-Silhouette trägt und nur die untere Hälfte Body ist.
  // Alle übrigen Kinds nutzen bis zu 2 Zeilen (max. 64 Zeichen gesamt).
  const maxLines = kind === 'person' ? 1 : 2;
  const descLines = description ? splitDescription(description, maxLines) : [];

  return (
    <>
      {/* Tech-Icon in der Kopfzeile (gleiche Größe wie das externe ↗-Icon) */}
      <TechIconBadge technologySlug={firstTechSlug} x={techIconX} y={techIconY} size={ICON_SIZE} />

      {/* Externes ↗-Icon (nur wenn external) – Tooltip via <title> */}
      {external && (
        <g transform={`translate(${externalIconX}, ${externalIconY})`}>
          <svg
            width={ICON_SIZE}
            height={ICON_SIZE}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-500 dark:text-gray-400"
          >
            <title>Externes System</title>
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          </svg>
        </g>
      )}

      {/* Name (drag handle area) — or inline edit input */}
      {isEditing ? (
        <foreignObject
          x={kind === 'component' ? UML_COMPONENT_ICON_TOTAL_W + 8 : 8}
          y={layout.nameY - 18}
          width={width - (kind === 'component' ? UML_COMPONENT_ICON_TOTAL_W + 16 : 16)}
          height={36}
        >
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Input
              autoFocus
              type="text"
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              onKeyDown={onEditKeyDown}
              placeholder={editingLabel ?? name}
            />
          </div>
        </foreignObject>
      ) : (
        <text
          ref={nameRef}
          x={nameX}
          y={layout.nameY}
          textAnchor={nameAnchor}
          className={
            statusTextClass
              ? `fill-current ${statusTextClass} drag-handle`
              : 'fill-gray-900 dark:fill-gray-100 drag-handle'
          }
          fontSize={layout.nameFontSize}
          fontWeight="bold"
          style={{ cursor: 'grab' }}
        >
          {name}
        </text>
      )}

      {/* Description – bis zu 2 Zeilen unter dem Namen, max. 64 Zeichen gesamt.
          Kein Truncate/Ellipsis/Tooltip: Übersteigt die Description 64 Zeichen,
          wird sie NICHT gerendert (zwingt Datenqualitäts-Kurration). */}
      {!isEditing && descLines.length > 0 && (
        <>
          <text
            x={width / 2}
            y={layout.descY1}
            textAnchor="middle"
            className="fill-gray-600 dark:fill-gray-400"
            fontSize={10}
          >
            {descLines[0]}
          </text>
          {descLines[1] && (
            <text
              x={width / 2}
              y={layout.descY2}
              textAnchor="middle"
              className="fill-gray-600 dark:fill-gray-400"
              fontSize={10}
            >
              {descLines[1]}
            </text>
          )}
        </>
      )}
    </>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

/**
 * Zerlegt eine Description in maximal `maxLines` Zeilen. Bricht bevorzugt an der
 * letzten Wortgrenze innerhalb von `MAX_DESCRIPTION_LINE` Zeichen um (sonst harter
 * Schnitt). Person-Cards (`maxLines = 1`) rendern nur eine Zeile à max. 32 Zeichen.
 */
function splitDescription(description: string, maxLines: number): string[] {
  if (maxLines === 1) {
    if (description.length > MAX_DESCRIPTION_LINE) return [];
    return [description];
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) return [];
  if (description.length <= MAX_DESCRIPTION_LINE) return [description];

  const first = description.slice(0, MAX_DESCRIPTION_LINE);
  const spaceIndex = first.lastIndexOf(' ');
  const cut = spaceIndex > 0 ? spaceIndex : MAX_DESCRIPTION_LINE;
  const line1 = description.slice(0, cut).trim();
  const line2 = description.slice(cut).trim();
  return line2 ? [line1, line2] : [line1];
}
