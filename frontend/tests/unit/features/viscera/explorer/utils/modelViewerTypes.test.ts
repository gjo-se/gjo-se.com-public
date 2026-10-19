/**
 * Tests: modelViewerTypes – contract
 *
 * This module is declaration-only, so its contract is asserted at the type
 * level (display type union, optional fields, required counters) plus a
 * runtime instance check that the declared shapes are consumable.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  EdgeLine,
  ModelViewerProps,
  NormalizedModelObject,
} from '@src/features/viscera/explorer/utils/modelViewerTypes';

describe('modelViewerTypes – contract', () => {
  it('beschränkt den Anzeige-Typ auf die vier Viewer-Typen', () => {
    expectTypeOf<NormalizedModelObject['type']>().toEqualTypeOf<
      'system' | 'container' | 'component' | 'person'
    >();

    const object: NormalizedModelObject = {
      id: 'api',
      name: 'API',
      type: 'container',
      edgesCount: 2,
      hasChildren: false,
    };

    expect(object.type).toBe('container');
  });

  it('macht parentId und Zusatzfelder optional', () => {
    const minimal: NormalizedModelObject = {
      id: 'api',
      name: 'API',
      type: 'component',
      edgesCount: 0,
      hasChildren: false,
    };
    const full: NormalizedModelObject = {
      ...minimal,
      parentId: 'backend',
      description: 'Handler',
      tags: ['backend'],
      technologies: ['python'],
    };

    expect(minimal.parentId).toBeUndefined();
    expect(full.technologies).toEqual(['python']);
  });

  it('modelliert eine Kante mit optionaler Beschreibung', () => {
    const edge: EdgeLine = { from: 'api', to: 'db', description: 'reads' };

    expect(edge).toEqual({ from: 'api', to: 'db', description: 'reads' });
    expectTypeOf<EdgeLine['description']>().toEqualTypeOf<string | undefined>();
  });

  it('verlangt alle Callback- und Zustandsfelder in ModelViewerProps', () => {
    const props: ModelViewerProps = {
      objects: [],
      edges: [],
      selectedObjectId: null,
      hoveredObjectId: null,
      onObjectClick: () => undefined,
      onObjectHover: () => undefined,
      onEdgeClick: () => undefined,
      onToggleExpand: () => undefined,
      expandedIds: new Set<string>(),
    };

    expect(props.selectedObjectId).toBeNull();
    expect(props.expandedIds.size).toBe(0);
    expectTypeOf<ModelViewerProps['onEdgeClick']>().toEqualTypeOf<
      (from: string, to: string) => void
    >();
  });
});
