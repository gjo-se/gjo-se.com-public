import { getNodesBounds, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

import Button from '@src/components/primitives/Button/Button';

// --- Props ---

export interface ExportButtonProps {
  /** View key used for the filename, e.g. 'system-landscape' */
  viewKey: string;
}

// --- Constants ---

const SVG_NS = 'http://www.w3.org/2000/svg';
const PADDING = 40;

/** SVG properties that should be inlined for correct standalone rendering. */
const SVG_PRESENTATION_ATTRS = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
];

const CSS_PRESENTATION_PROPS = [
  'font-family',
  'font-size',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
  'text-decoration',
  'text-transform',
  'letter-spacing',
  'word-spacing',
];

// --- Helpers ---

function buildFilename(viewKey: string): string {
  const safeKey = viewKey.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${safeKey}-${timestamp}.svg`;
}

// --- Component ---

/**
 * Button that serializes the current React Flow diagram to a standalone .svg file
 * and triggers a browser download.
 *
 * Uses React Flow's `getNodesBounds()` API to compute the bounding box for the
 * SVG viewBox, then serializes the React Flow viewport DOM element.
 */
export default function ExportButton({ viewKey }: ExportButtonProps) {
  const { getNodes } = useReactFlow();

/** Export the current diagram as a downloadable SVG file. */
const handleExport = useCallback(() => {
  const nodes = getNodes();
  if (nodes.length === 0) return;

  // Bounding box aller sichtbaren Nodes (Flow-Koordinaten).
  const bounds = getNodesBounds(nodes);

  // Native SVG-Quellen von React Flow: Die Kanten liegen in einem echten <svg>,
  // jede Card ist ein eigenes <svg> innerhalb einer positionierten Node-Div.
  const edgesSvg = document.querySelector<SVGSVGElement>('.react-flow__edges > svg');
  const nodeElements = [...document.querySelectorAll<HTMLElement>('.react-flow__node')];
  if (!edgesSvg) return;

  // Standalone-SVG-Wrapper mit passendem viewBox (Flow-Koordinaten + Padding).
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('version', '1.1');
  svg.setAttribute(
    'viewBox',
    `${bounds.x - PADDING} ${bounds.y - PADDING} ${bounds.width + PADDING * 2} ${bounds.height + PADDING * 2}`,
  );
  svg.setAttribute('width', String(bounds.width + PADDING * 2));
  svg.setAttribute('height', String(bounds.height + PADDING * 2));

  // 1) Kanten: nativ-svg-Inhalt (Defs/Marker + Edge-Pfade) direkt übernehmen.
  //    Das Edges-<svg> liegt bereits in Flow-Koordinaten – kein zusätzliches Transform nötig.
  const edgesClone = edgesSvg.cloneNode(true) as SVGSVGElement;
  inlineComputedStyles(edgesSvg, edgesClone);
  while (edgesClone.firstChild) {
    svg.appendChild(edgesClone.firstChild);
  }

  // 2) Nodes: jede Card als <g transform="translate(x, y)">-Gruppe übernehmen,
  //    damit sie in Flow-Koordinaten platziert wird.
  nodeElements.forEach((nodeEl) => {
    const cardSvg = nodeEl.querySelector<SVGSVGElement>(':scope > svg');
    if (!cardSvg) return;

    const m = /translate\(\s*([-\d.]+)px?,\s*([-\d.]+)px?\)/.exec(nodeEl.style.transform || '');
    if (!m) return;

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', `translate(${m[1]}, ${m[2]})`);
    const cardClone = cardSvg.cloneNode(true) as SVGSVGElement;
    inlineComputedStyles(cardSvg, cardClone);
    g.appendChild(cardClone);
    svg.appendChild(g);
  });

  // Serialize and download
  const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);

  const blob = new Blob([xmlDeclaration + svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = buildFilename(viewKey);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}, [viewKey, getNodes]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      title="Export SVG"
      aria-label="Diagramm als SVG exportieren"
    >
      {/* Download icon inline SVG */}
      <svg
        className="mr-1 inline-block size-4"
        xmlns={SVG_NS}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      SVG
    </Button>
  );
}

/**
 * Walk the source tree, read computed styles and write them as inline SVG attributes
 * on the target tree so the standalone SVG renders correctly outside the app.
 */
function inlineComputedStyles(source: Element, target: Element): void {
  const computed = window.getComputedStyle(source);

  // Copy SVG presentation attributes from computed CSS
  SVG_PRESENTATION_ATTRS.forEach((attr) => {
    const value = computed.getPropertyValue(attr);
    if (value && value !== 'none' && value !== 'rgba(0, 0, 0, 0)') {
      (target as SVGElement).setAttribute(attr, value);
    }
  });

  // Copy CSS text properties as inline attributes
  CSS_PRESENTATION_PROPS.forEach((prop) => {
    const value = computed.getPropertyValue(prop);
    if (value) {
      (target as SVGElement).setAttribute(prop, value);
    }
  });

  // Recurse into children
  const sourceChildren = source.children;
  const targetChildren = target.children;
  for (let i = 0; i < sourceChildren.length; i++) {
    const sourceChild = sourceChildren[i];
    const targetChild = targetChildren[i];
    if (sourceChild && targetChild) {
      inlineComputedStyles(sourceChild, targetChild);
    }
  }
}
