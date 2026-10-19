/**
 * helperLines.ts – Reine Logik für Drag-Hilfslinien (#2523).
 *
 * Beim Verschieben einer Card werden deren Kanten (links/Mitte/rechts bzw.
 * oben/Mitte/unten) gegen die Kanten aller anderen Nodes geprüft. Liegt eine
 * Kante innerhalb des Schwellwerts, wird eine Hilfslinie (vertikal/horizontal)
 * im Flow-Koordinatenraum gemeldet.
 *
 * Zusätzlich wird der Abstand (Maßlinie) zur nächstgelegenen Nachbar-Box pro
 * Achse berechnet (Figma-Style): Liegt eine andere Box horizontal/vertikal
 * nahe genug, wird der Zwischenraum als Maßlinie mit Zahlenwert gemeldet.
 *
 * **Reine Optik:** Die Linien/Abstände verändern das DnD-Verhalten NICHT — das
 * Grid-Snap des bestehenden Drags bleibt unangetastet.
 *
 * Bewusst ohne Store-/React-Import — berechenbar und testbar.
 */

/** Rechteck einer Node im Flow-Koordinatenraum (links/oben = Anker). */
export interface AlignBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Aktive Hilfslinien + Abstände — Flow-Koordinaten. */
export interface HelperLines {
  /** Vertikale Ausrichtungslinie (x-Koordinate). */
  x?: number;
  /** Horizontale Ausrichtungslinie (y-Koordinate). */
  y?: number;
  /** Horizontaler Abstand zur nächstgelegenen Nachbar-Box (Messlinie horizontal). */
  xGap?: Measure;
  /** Vertikaler Abstand zur nächstgelegenen Nachbar-Box (Messlinie vertikal). */
  yGap?: Measure;
}

/** Maßlinie (Figma-Style) im Flow-Koordinatenraum. */
export interface Measure {
  /** Start-Kante in Messrichtung (Flow) — innere Kante der gezogenen Box. */
  from: number;
  /** End-Kante in Messrichtung (Flow) — zugewandte Kante der Nachbar-Box. */
  to: number;
  /** Abstand in Flow-Einheiten (ungerundet). */
  value: number;
  /** Position der Maßlinie senkrecht zur Messrichtung (Flow). */
  at: number;
}

/** Snap-Schwelle für Ausrichtungslinien in Flow-Einheiten. */
const THRESHOLD = 8;

/** Distanz-Schwelle, ab der kein Abstand (Maßlinie) mehr angezeigt wird. */
const DISTANCE_THRESHOLD = 100;

/**
 * Findet aktive Ausrichtungslinien + Abstände für das gezogene Rechteck.
 *
 * @returns `HelperLines` mit den Flow-Koordinaten aktiver Linien und Abständen
 *   (ggf. leer). Wird nichts gefunden, bleibt das Objekt leer.
 */
export function computeHelperLines(dragged: AlignBox, others: AlignBox[]): HelperLines {
  const dx = pointOffsets(dragged.width);
  const dy = pointOffsets(dragged.height);

  let bestX = Infinity;
  let bestY = Infinity;
  let lineX: number | undefined;
  let lineY: number | undefined;

  others.forEach((o) => {
    const ox = pointOffsets(o.width);
    const oy = pointOffsets(o.height);

    // Vertikale Ausrichtung (x): alle Ankerpunkte des Ziels gegen die anderen.
    for (let d = 0; d < 3; d += 1) {
      for (let oi = 0; oi < 3; oi += 1) {
        const target = o.left + ox[oi];
        const delta = Math.abs(dragged.left + dx[d] - target);
        if (delta < bestX && delta <= THRESHOLD) {
          bestX = delta;
          lineX = target;
        }
      }
    }

    // Horizontale Ausrichtung (y).
    for (let d = 0; d < 3; d += 1) {
      for (let oi = 0; oi < 3; oi += 1) {
        const target = o.top + oy[oi];
        const delta = Math.abs(dragged.top + dy[d] - target);
        if (delta < bestY && delta <= THRESHOLD) {
          bestY = delta;
          lineY = target;
        }
      }
    }
  });

  const lines: HelperLines = {};
  if (lineX !== undefined) lines.x = lineX;
  if (lineY !== undefined) lines.y = lineY;

  const xGap = findHorizontalGap(dragged, others);
  if (xGap) lines.xGap = xGap;
  const yGap = findVerticalGap(dragged, others);
  if (yGap) lines.yGap = yGap;

  return lines;
}

/**
 * Findet den kleinsten horizontalen Abstand zur nächstgelegenen Nachbar-Box.
 * Nur Boxen mit vertikalem Überlapp zählen; der Abstand muss innerhalb
 * `DISTANCE_THRESHOLD` liegen. Die Maßlinie liegt auf der Mitte des Überlapps.
 */
function findHorizontalGap(dragged: AlignBox, others: AlignBox[]): Measure | undefined {
  let best: Measure | undefined;
  let bestGap = Infinity;

  others.forEach((o) => {
    const overlapTop = Math.max(dragged.top, o.top);
    const overlapBottom = Math.min(dragged.top + dragged.height, o.top + o.height);
    if (overlapBottom - overlapTop <= 0) return;

    let from: number;
    let to: number;
    if (o.left >= dragged.left + dragged.width) {
      from = dragged.left + dragged.width;
      to = o.left;
    } else if (dragged.left >= o.left + o.width) {
      from = o.left + o.width;
      to = dragged.left;
    } else {
      return; // horizontal überlappend → kein klarer Abstand in x
    }

    const gap = to - from;
    if (gap >= 0 && gap <= DISTANCE_THRESHOLD && gap < bestGap) {
      bestGap = gap;
      best = { from, to, value: gap, at: (overlapTop + overlapBottom) / 2 };
    }
  });

  return best;
}

/**
 * Findet den kleinsten vertikalen Abstand zur nächstgelegenen Nachbar-Box.
 * Nur Boxen mit horizontalem Überlapp zählen; der Abstand muss innerhalb
 * `DISTANCE_THRESHOLD` liegen. Die Maßlinie liegt auf der Mitte des Überlapps.
 */
function findVerticalGap(dragged: AlignBox, others: AlignBox[]): Measure | undefined {
  let best: Measure | undefined;
  let bestGap = Infinity;

  others.forEach((o) => {
    const overlapLeft = Math.max(dragged.left, o.left);
    const overlapRight = Math.min(dragged.left + dragged.width, o.left + o.width);
    if (overlapRight - overlapLeft <= 0) return;

    let from: number;
    let to: number;
    if (o.top >= dragged.top + dragged.height) {
      from = dragged.top + dragged.height;
      to = o.top;
    } else if (dragged.top >= o.top + o.height) {
      from = o.top + o.height;
      to = dragged.top;
    } else {
      return; // vertikal überlappend → kein klarer Abstand in y
    }

    const gap = to - from;
    if (gap >= 0 && gap <= DISTANCE_THRESHOLD && gap < bestGap) {
      bestGap = gap;
      best = { from, to, value: gap, at: (overlapLeft + overlapRight) / 2 };
    }
  });

  return best;
}

/** Offsets der drei Ankerpunkte (Kante, Mitte, gegenüberliegende Kante). */
function pointOffsets(size: number): [number, number, number] {
  return [0, size / 2, size];
}
