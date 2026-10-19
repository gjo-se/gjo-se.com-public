/**
 * Tests: viewerProps – contract
 *
 * This module is declaration-only, so its contract is asserted at the type
 * level: every callback is optional (shell components may omit it), and the
 * placeholder confirm callback carries the documented promise signature.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';

import type { ViewerDiagramCallbacks } from '@src/features/viscera/viewer/utils/viewerProps';

describe('ViewerDiagramCallbacks – contract', () => {
  it('erlaubt ein leeres Callback-Objekt', () => {
    const empty: ViewerDiagramCallbacks = {};

    expect(empty).toEqual({});
  });

  it('typiert den Placeholder-Confirm als Promise mit optionaler sourceNodeId', () => {
    const callbacks: ViewerDiagramCallbacks = {
      onConfirmPlaceholder: async (tempId, name, opts) => ({ id: `${tempId}-${name}-${opts?.sourceNodeId ?? ''}` }),
    };

    expectTypeOf<ViewerDiagramCallbacks['onConfirmPlaceholder']>().toEqualTypeOf<
      | ((
          tempId: string,
          name: string,
          opts?: { sourceNodeId?: string },
        ) => Promise<Record<string, unknown> | null>)
      | undefined
    >();

    expect(callbacks.onConfirmPlaceholder).toBeTypeOf('function');
  });

  it('modelliert Gruppen-Callbacks mit den dokumentierten Signaturen', () => {
    const callbacks: ViewerDiagramCallbacks = {
      onRenameGroup: (id, name) => `${id}:${name}`,
      onDeleteGroup: () => undefined,
      onCreateGroup: async (name, position) => ({ ok: true, id: `${name}@${position.x}`, name }),
    };

    expectTypeOf<ViewerDiagramCallbacks['onRenameGroup']>().toEqualTypeOf<
      ((id: string, name: string) => void) | undefined
    >();
    expect(callbacks.onDeleteGroup).toBeTypeOf('function');
  });
});
