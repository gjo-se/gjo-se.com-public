import { describe, expect, it } from 'vitest';

import { computeHelperLines } from '@src/features/viscera/viewer/utils/helperLines';

import type { AlignBox } from '@src/features/viscera/viewer/utils/helperLines';

describe('computeHelperLines', () => {
  const box = (left: number, top: number, width: number, height: number): AlignBox => ({
    left,
    top,
    width,
    height,
  });

  describe('Ausrichtungslinien', () => {
    it('liefert eine vertikale Linie, wenn die linke Kante aligned ist', () => {
      const dragged = box(100, 50, 40, 30);
      const other = box(100, 200, 40, 30);
      const lines = computeHelperLines(dragged, [other]);
      expect(lines.x).toBe(100);
      expect(lines.y).toBeUndefined();
    });

    it('liefert eine horizontale Linie, wenn die obere Kante aligned ist', () => {
      const dragged = box(50, 100, 40, 30);
      const other = box(200, 100, 40, 30);
      const lines = computeHelperLines(dragged, [other]);
      expect(lines.y).toBe(100);
      expect(lines.x).toBeUndefined();
    });

    it('liefert nichts, wenn keine Kante nahe genug ist', () => {
      const dragged = box(0, 0, 40, 30);
      const other = box(500, 500, 40, 30);
      const lines = computeHelperLines(dragged, [other]);
      expect(lines.x).toBeUndefined();
      expect(lines.y).toBeUndefined();
      expect(lines.xGap).toBeUndefined();
      expect(lines.yGap).toBeUndefined();
    });
  });

  describe('Abstände (Maßlinien)', () => {
    it('liefert horizontalen Abstand zur Nachbar-Box rechts', () => {
      const dragged = box(100, 100, 40, 30);
      const other = box(160, 100, 40, 30); // gap = 20
      const lines = computeHelperLines(dragged, [other]);
      expect(lines.xGap).toEqual({ from: 140, to: 160, value: 20, at: 115 });
    });

    it('liefert horizontalen Abstand zur Nachbar-Box links', () => {
      const dragged = box(160, 100, 40, 30);
      const other = box(100, 100, 40, 30); // gap = 20
      const lines = computeHelperLines(dragged, [other]);
      expect(lines.xGap).toEqual({ from: 140, to: 160, value: 20, at: 115 });
    });

    it('liefert vertikalen Abstand zur Nachbar-Box unten', () => {
      const dragged = box(100, 100, 40, 30);
      const other = box(100, 150, 40, 30); // gap = 20
      const lines = computeHelperLines(dragged, [other]);
      expect(lines.yGap).toEqual({ from: 130, to: 150, value: 20, at: 120 });
    });

    it('liefert keinen horizontalen Abstand ohne vertikalen Überlapp', () => {
      const dragged = box(100, 100, 40, 30);
      const other = box(160, 300, 40, 30);
      const lines = computeHelperLines(dragged, [other]);
      expect(lines.xGap).toBeUndefined();
    });

    it('wählt den nächsten von mehreren Nachbarn', () => {
      const dragged = box(100, 100, 40, 30);
      const near = box(160, 100, 40, 30); // gap = 20
      const far = box(300, 100, 40, 30); // gap = 160 → über Schwelle
      const lines = computeHelperLines(dragged, [near, far]);
      expect(lines.xGap?.value).toBe(20);
    });
  });
});
