import { enableMapSet } from 'immer';
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Required for badgeStates Map in FilterSlice (produce calls elsewhere also proxy it)
enableMapSet();

import { createCanvasSlice } from './canvasSlice';
import { createDiagramSlice } from './diagramSlice';
import { createEditorSlice } from './editorSlice';
import { createFilterSlice } from './filterSlice';
import { createFlowSlice } from './flowSlice';
import { logger } from './middleware/logger';
import { migrateLegacyStorage } from './middleware/migration';
import { initPersistLocal, subscribePersistLocal } from './middleware/persistLocal';
import { hydrateViewportFromUrl } from './middleware/persistUrlCodec';
import { initPersistUrl } from './middleware/persistUrlInit';
import { subscribePersistUrl } from './middleware/persistUrlSubscribe';
import { syncFilterFromUrl } from './middleware/persistUrlSync';
import { createModulesSlice } from './modulesSlice';
import { createNavigationSlice } from './navigationSlice';
import { createUISlice } from './uiSlice';
import { createVisceraCommandHistory, getVisceraCommandHistory } from './visceraCommandHistory';

import type { CanvasSlice } from './canvasSlice';
import type { DiagramSlice } from './diagramSlice';
import type { EditorSlice } from './editorSlice';
import type { FilterSlice } from './filterSlice';
import type { FlowSlice } from './flowSlice';
import type { ModulesSlice } from './modulesSlice';
import type { NavigationSlice } from './navigationSlice';
import type { UISlice } from './uiSlice';

export { syncFilterFromUrl };

export type VisceraStore = CanvasSlice &
  DiagramSlice &
  EditorSlice &
  FilterSlice &
  FlowSlice &
  ModulesSlice &
  NavigationSlice &
  UISlice;

// ── Command History Singleton ─────────────────────────────────────────────
// Lives in the leaf module `./visceraCommandHistory` (breaks the canvasSlice ⇄ index cycle).
// Re-exported here to keep the public store API unchanged.
export { getVisceraCommandHistory };

/**
 *
 */
function createVisceraStore() {
  const initialViewport = hydrateViewportFromUrl();

  const store = create<VisceraStore>()(
    devtools(
      subscribeWithSelector(
        logger(
          immer((...args) => ({
            ...createCanvasSlice(initialViewport)(...args),
            ...createDiagramSlice(...args),
            ...createFilterSlice(...args),
            ...createFlowSlice(...args),
            ...createModulesSlice(...args),
            ...createNavigationSlice(...args),
            ...createEditorSlice(...args),
            ...createUISlice(...args),
          })),
        ),
      ),
      { name: 'VisceraStore' },
    ),
  );

  // ── Legacy Migration (einmalig, idempotent) ────────────────────────────────
  // Muss VOR initPersistLocal laufen, da initPersistLocal viscera_state liest.
  // migrateLegacyStorage() prüft selbst auf Idempotenz (skip wenn viscera_state existiert).
  const migrationResult = migrateLegacyStorage();
  if (migrationResult.migrated > 0 || migrationResult.errors > 0) {
    console.info('[viscera:migration:result]', migrationResult);
  }

  // ── Persistence Middleware ────────────────────────────────────────────────
  // initPersistUrl: reads URL params → Store (initial deep-link restore)
  // subscribePersistUrl: subscribes Store.viewport → URL (bidirectional, sole writer)
  initPersistUrl(store);
  subscribePersistUrl(store);
  initPersistLocal(store);
  subscribePersistLocal(store);

  // ── Command History ──────────────────────────────────────────────────────
  createVisceraCommandHistory(store.getState());

  return store;
}

export const useVisceraStore = createVisceraStore();
