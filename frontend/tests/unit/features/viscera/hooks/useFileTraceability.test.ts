/**
 * Tests: useFileTraceability
 *
 * Verifies the file-link derivation per element type: systems and persons link
 * their own YAML node file, containers link their parent system file, a d2 key
 * adds rendered SVG plus source, and ADR decisions add markdown links.
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFileTraceability } from '@src/features/viscera/hooks/useFileTraceability';

import type { Adr } from '@src/features/viscera/services/adrFileService';

function makeAdr(patch: Partial<Adr> = {}): Adr {
  return {
    id: 1,
    title: 'ADR',
    status: 'accepted',
    date: '2026-01-01',
    systems: [],
    diagrams: [],
    tags: [],
    idString: '0001',
    content: '',
    filePath: '/architecture/adr/0001-test.md',
    ...patch,
  };
}

describe('useFileTraceability', () => {
  it('links the node file of a system', () => {
    const { result } = renderHook(() =>
      useFileTraceability('backend', { elementType: 'system' }),
    );

    expect(result.current).toEqual([
      { label: 'backend.yml', path: 'architecture/nodes/backend.yml', type: 'yaml' },
    ]);
  });

  it('links the node file of a person', () => {
    const { result } = renderHook(() =>
      useFileTraceability('greg', { elementType: 'person' }),
    );

    expect(result.current).toEqual([
      { label: 'greg.yml', path: 'architecture/nodes/greg.yml', type: 'yaml' },
    ]);
  });

  it('derives the parent system from a dotted container id', () => {
    const { result } = renderHook(() =>
      useFileTraceability('backend.api', { elementType: 'container' }),
    );

    expect(result.current).toEqual([
      { label: 'backend.yml', path: 'architecture/nodes/backend.yml', type: 'yaml' },
    ]);
  });

  it('prefers an explicit parent system id for containers', () => {
    const { result } = renderHook(() =>
      useFileTraceability('api', { elementType: 'container', parentSystemId: 'backend' }),
    );

    expect(result.current[0]).toEqual({
      label: 'backend.yml',
      path: 'architecture/nodes/backend.yml',
      type: 'yaml',
    });
  });

  it('adds d2 svg and source links when a d2 key is present', () => {
    const { result } = renderHook(() =>
      useFileTraceability('backend', { elementType: 'system', d2: 'backend-container' }),
    );

    expect(result.current).toEqual([
      { label: 'backend.yml', path: 'architecture/nodes/backend.yml', type: 'yaml' },
      {
        label: 'backend-container.d2.svg',
        path: 'architecture/diagrams/rendered/backend-container.d2.svg',
        type: 'd2-svg',
      },
      {
        label: 'backend-container.d2',
        path: 'architecture/diagrams/src/backend-container.d2',
        type: 'd2-source',
      },
    ]);
  });

  it('adds a markdown link per referencing adr', () => {
    const { result } = renderHook(() =>
      useFileTraceability('backend', {
        elementType: 'system',
        decisions: [makeAdr(), makeAdr({ idString: '0002', filePath: '/architecture/adr/0002-two.md' })],
      }),
    );

    expect(result.current.map((file) => file.label)).toEqual([
      'backend.yml',
      '0001-test.md',
      '0002-two.md',
    ]);
    expect(result.current.filter((file) => file.type === 'adr')).toHaveLength(2);
  });
});
