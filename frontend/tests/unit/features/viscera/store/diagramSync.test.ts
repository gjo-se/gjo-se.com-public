/**
 * Tests: diagramSync
 *
 * Behaviour: sync entries are created pending with a unique mutation id, and
 * the diagram status schema accepts exactly the six viscera slugs.
 */

import { describe, expect, it } from 'vitest';

import { buildSyncEntry, diagramStatusSchema } from '@src/features/viscera/store/diagramSync';

describe('buildSyncEntry', () => {
  it('builds a pending entry with retryCount 0 and the given payload', () => {
    const entry = buildSyncEntry('api', 'move', { x: 10, y: 20 });

    expect(entry).toMatchObject({
      nodeId: 'api',
      action: 'move',
      payload: { x: 10, y: 20 },
      retryCount: 0,
      status: 'pending',
    });
    expect(entry.mutationId).toEqual(expect.any(String));
    expect(entry.mutationId.length).toBeGreaterThan(0);
  });

  it('generates a fresh mutation id for every entry', () => {
    const first = buildSyncEntry('api', 'create', {});
    const second = buildSyncEntry('api', 'create', {});

    expect(first.mutationId).not.toBe(second.mutationId);
  });
});

describe('diagramStatusSchema', () => {
  it.each([
    'viscera-approved',
    'viscera-pending',
    'viscera-planned',
    'viscera-scan_missing',
    'viscera-deprecated',
    'viscera-rejected',
  ])('accepts the lifecycle slug %s', (slug) => {
    expect(diagramStatusSchema.safeParse(slug).success).toBe(true);
  });

  it.each(['approved', 'pending', 'viscera-', '', 'VISCERA-APPROVED'])(
    'rejects the non-canonical value %s',
    (value) => {
      expect(diagramStatusSchema.safeParse(value).success).toBe(false);
    },
  );
});
