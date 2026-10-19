/**
 * Tests: cardShape
 *
 * Verifies the card-kind → rect-props map and the documented shape constants,
 * including the fallback for an unknown kind.
 */

import { describe, expect, it } from 'vitest';

import {
  CYLINDER_ELLIPSE_HEIGHT,
  getCardShapeProps,
  SYSTEM_HEADER_HEIGHT,
  UML_COMPONENT_ICON_X,
  UML_COMPONENT_ICON_Y,
  UML_COMPONENT_RECT_GAP,
  UML_COMPONENT_RECT_H,
  UML_COMPONENT_RECT_W,
} from '@src/features/viscera/viewer/utils/cardShape';

import type { CardKind } from '@src/features/viscera/viewer/utils/cardShape';

describe('getCardShapeProps', () => {
  it.each<[CardKind, number, number]>([
    ['system', 6, 6],
    ['container', 12, 12],
    ['component', 4, 4],
    ['store', 8, 8],
    ['person', 6, 6],
    ['table', 4, 4],
  ])('liefert rx/ry für %s', (kind, rx, ry) => {
    expect(getCardShapeProps(kind)).toEqual({ rx, ry });
  });

  it('fällt bei unbekanntem Kind auf die System-Form zurück', () => {
    expect(getCardShapeProps('unknown' as CardKind)).toEqual({ rx: 6, ry: 6 });
  });
});

describe('cardShape – Konstanten', () => {
  it('fixiert Header-, Zylinder- und UML-Icon-Maße', () => {
    expect(SYSTEM_HEADER_HEIGHT).toBe(7);
    expect(CYLINDER_ELLIPSE_HEIGHT).toBe(10);
    expect(UML_COMPONENT_ICON_X).toBe(6);
    expect(UML_COMPONENT_ICON_Y).toBe(8);
    expect(UML_COMPONENT_RECT_W).toBe(10);
    expect(UML_COMPONENT_RECT_H).toBe(5);
    expect(UML_COMPONENT_RECT_GAP).toBe(3);
  });
});
