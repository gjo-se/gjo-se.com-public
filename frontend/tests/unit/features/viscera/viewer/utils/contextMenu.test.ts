/**
 * Tests: contextMenu
 *
 * Verifies viewport-edge clamping for the viscera context menu (fits, minimum
 * offset, right/bottom overflow, menu larger than the viewport) and the panel
 * style contract built from the clamps.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  clampX,
  clampY,
  CONTEXT_MENU_MAX_HEIGHT,
  contextMenuPanelStyle,
} from '@src/features/viscera/viewer/utils/contextMenu';

function setViewportSize(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

beforeEach(() => {
  setViewportSize(1024, 768);
});

describe('clampX', () => {
  it('behält die Position bei, wenn das Menü vollständig passt', () => {
    expect(clampX(100, 200)).toBe(100);
  });

  it('schiebt das Menü bei Überlauf nach links', () => {
    expect(clampX(900, 200)).toBe(816);
  });

  it('nutzt mindestens den Rand-Abstand von vier Pixeln', () => {
    expect(clampX(1, 200)).toBe(4);
    expect(clampX(4, 200)).toBe(4);
    expect(clampX(5, 200)).toBe(5);
  });

  it('fällt auf vier Pixel zurück, wenn das Menü breiter als der Viewport ist', () => {
    expect(clampX(900, 1100)).toBe(4);
  });
});

describe('clampY', () => {
  it('behält die Position bei, wenn das Menü vollständig passt', () => {
    expect(clampY(100, 200)).toBe(100);
  });

  it('schiebt das Menü bei Überlauf nach oben', () => {
    expect(clampY(700, 200)).toBe(560);
  });

  it('nutzt mindestens den Rand-Abstand von vier Pixeln', () => {
    expect(clampY(1, 200)).toBe(4);
  });

  it('fällt auf vier Pixel zurück, wenn das Menü höher als der Viewport ist', () => {
    expect(clampY(900, 900)).toBe(4);
  });
});

describe('contextMenuPanelStyle', () => {
  it('baut den Panel-Stil aus geklemmter Position und festen Grenzen', () => {
    expect(contextMenuPanelStyle(100, 50, 200)).toEqual({
      position: 'absolute',
      left: 100,
      top: 50,
      minWidth: 260,
      maxWidth: 380,
      maxHeight: CONTEXT_MENU_MAX_HEIGHT,
      overflowY: 'auto',
    });
  });

  it('klemmt beide Achsen bei Überlauf', () => {
    const style = contextMenuPanelStyle(900, 700, 200);

    expect(style.left).toBe(816);
    expect(style.top).toBe(440);
  });
});
