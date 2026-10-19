/**
 * Einmalige Migration alter localStorage-Keys ins viscera_state-Format.
 *
 * Idempotent: Editor-Keys werden auch nachgemigriert wenn viscera_state
 * bereits existiert aber den editor-Scope noch nicht enthält.
 *
 * Alte Keys:
 *   - viscera:layout:{viewKey}      → viscera_state.canvas.overrides
 *   - viscera_last_url:{viewKey}    → viscera_state.navigation.lastUrl[viewKey]
 *   - viscera_perspective_bar_collapsed → viscera_state.ui.panelCollapsed
 *   - viscera:adr-editor:splitRatio → viscera_state.editor.splitRatioAdr
 *   - architecture-viewer:editor:splitRatio → viscera_state.editor.splitRatioYaml
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MigrationResult {
  migrated: number;
  skipped: number;
  errors: number;
}

interface PersistedCanvasState {
  overrides: Record<string, { x: number; y: number }>;
}

interface PersistedEditorState {
  splitRatioAdr?: number;
  splitRatioYaml?: number;
}

interface PersistedNavigationState {
  lastUrl?: Record<string, string>;
}

interface PersistedState {
  canvas: PersistedCanvasState;
  editor?: PersistedEditorState;
  ui: PersistedUIState;
  navigation: PersistedNavigationState;
}

interface PersistedUIState {
  panelCollapsed?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const OLD_KEYS = {
  layoutPrefix: 'viscera:layout:',
  lastUrlPrefix: 'viscera_last_url:',
  collapsed: 'viscera_perspective_bar_collapsed',
  adrSplit: 'viscera:adr-editor:splitRatio',
  yamlSplit: 'architecture-viewer:editor:splitRatio',
} as const;

const NEW_STORAGE_KEY = 'viscera_state';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clampRatio(value: number): number {
  return Math.min(0.8, Math.max(0.2, value));
}

function isValidOverride(pos: unknown): pos is { x: number; y: number } {
  return (
    pos !== null &&
    typeof pos === 'object' &&
    Number.isFinite((pos as { x: number }).x) &&
    Number.isFinite((pos as { y: number }).y)
  );
}

/**
 * Migrates editor split-ratio keys when viscera_state already exists
 * but lacks the editor scope. Idempotent: skips keys already present.
 */
function migrateEditorKeysIfNeeded(existingState: PersistedState): MigrationResult {
  const needsAdr = existingState.editor?.splitRatioAdr === undefined;
  const needsYaml = existingState.editor?.splitRatioYaml === undefined;

  if (!needsAdr && !needsYaml) {
    return { migrated: 0, skipped: 1, errors: 0 };
  }

  let migrated = 0;
  let errors = 0;
  const editorState: PersistedEditorState = {
    ...existingState.editor,
  };

  if (needsAdr) {
    const raw = localStorage.getItem(OLD_KEYS.adrSplit);
    if (raw) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        editorState.splitRatioAdr = clampRatio(parsed / 100);
        localStorage.removeItem(OLD_KEYS.adrSplit);
        migrated += 1;
      } else {
        errors += 1;
      }
    }
  }

  if (needsYaml) {
    const raw = localStorage.getItem(OLD_KEYS.yamlSplit);
    if (raw) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        editorState.splitRatioYaml = clampRatio(parsed / 100);
        localStorage.removeItem(OLD_KEYS.yamlSplit);
        migrated += 1;
      } else {
        errors += 1;
      }
    }
  }

  if (migrated > 0) {
    existingState.editor = editorState;
    try {
      localStorage.setItem(NEW_STORAGE_KEY, JSON.stringify(existingState));
    } catch {
      return { migrated: 0, skipped: 0, errors: 1 };
    }
  }

  return { migrated, skipped: 0, errors };
}

/**
 * Einmalige Migration alter localStorage-Keys ins {@link NEW_STORAGE_KEY}-Format.
 *
 * - Prüft zuerst ob `viscera_state` bereits existiert → Idempotenz-Garantie.
 * - Enumieriert alle localStorage-Keys und kategorisiert sie nach Alt-Key-Patterns.
 * - Validiert und konvertiert Werte ins neue Schema.
 * - Schreibt nur dann `viscera_state`, wenn mindestens ein Key migriert wurde.
 * - Löscht alle migrierten Alt-Keys.
 * - Fehlertoleranz: korrupte JSON-Keys werden übersprungen (zählen als errors).
 *
 * @returns {@link MigrationResult} mit Zählern für migrierte, übersprungene und fehlerhafte Keys.
 */
export function migrateLegacyStorage(): MigrationResult {
  if (typeof window === 'undefined') {
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  // Idempotenz: wenn viscera_state existiert UND editor-Scope bereits
  // vorhanden ist, ist nichts zu migrieren.
  const existingState = readExistingPersistedState();
  if (existingState !== null) {
    return migrateEditorKeysIfNeeded(existingState);
  }

  const allKeys = snapshotKeys();
  if (allKeys.length === 0) {
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  const newState: PersistedState = {
    canvas: { overrides: {} },
    editor: {},
    ui: {},
    navigation: {},
  };

  let migrated = 0;
  let errors = 0;
  const keysToDelete: string[] = [];

  allKeys.forEach((key) => {
    // ── Layout-Overrides: viscera:layout:* ──────────────────────────────────
    if (key.startsWith(OLD_KEYS.layoutPrefix)) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          Object.entries(parsed).forEach(([nodeId, pos]) => {
            if (isValidOverride(pos)) {
              newState.canvas.overrides[nodeId] = { x: pos.x, y: pos.y };
            }
          });
        }
        keysToDelete.push(key);
        migrated += 1;
      } catch {
        errors += 1;
        keysToDelete.push(key);
      }
      return;
    }

    // ── Letzte URLs: viscera_last_url:* ────────────────────────────────────
    if (key.startsWith(OLD_KEYS.lastUrlPrefix)) {
      try {
        const raw = localStorage.getItem(key);
        const viewKey = key.slice(OLD_KEYS.lastUrlPrefix.length);
        if (viewKey && raw && raw.length > 0) {
          if (!newState.navigation.lastUrl) {
            newState.navigation.lastUrl = {};
          }
          newState.navigation.lastUrl[viewKey] = raw;
        }
        keysToDelete.push(key);
        migrated += 1;
      } catch {
        errors += 1;
        keysToDelete.push(key);
      }
      return;
    }

    // ── Panel-Collapse: viscera_perspective_bar_collapsed ───────────────────
    if (key === OLD_KEYS.collapsed) {
      try {
        const raw = localStorage.getItem(key);
        newState.ui.panelCollapsed = raw === 'true';
        keysToDelete.push(key);
        migrated += 1;
      } catch {
        errors += 1;
        keysToDelete.push(key);
      }
    }

    // ── Editor: Adr Split Ratio ────────────────────────────────────────────
    if (key === OLD_KEYS.adrSplit) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) {
            newState.editor = newState.editor ?? {};
            newState.editor.splitRatioAdr = clampRatio(parsed / 100);
          }
        }
        keysToDelete.push(key);
        migrated += 1;
      } catch {
        errors += 1;
        keysToDelete.push(key);
      }
    }

    // ── Editor: Yaml Split Ratio ───────────────────────────────────────────
    if (key === OLD_KEYS.yamlSplit) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) {
            newState.editor = newState.editor ?? {};
            newState.editor.splitRatioYaml = clampRatio(parsed / 100);
          }
        }
        keysToDelete.push(key);
        migrated += 1;
      } catch {
        errors += 1;
        keysToDelete.push(key);
      }
    }
  });

  // Nur schreiben wenn tatsächlich etwas migriert wurde
  if (migrated === 0) {
    console.info('[viscera:migration]', { migrated: 0, skipped: 0, errors: 0 });
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  // Neuen State persistieren
  try {
    localStorage.setItem(NEW_STORAGE_KEY, JSON.stringify(newState));
  } catch {
    console.info('[viscera:migration]', {
      migrated: 0,
      skipped: 0,
      errors: 1,
      reason: 'storage-write-failed',
    });
    return { migrated: 0, skipped: 0, errors: 1 };
  }

  // Alte Keys löschen
  keysToDelete.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Entfernen fehlgeschlagen – unkritisch, Daten sind bereits im neuen Key
    }
  });

  console.info('[viscera:migration]', { migrated, skipped: 0, errors });
  return { migrated, skipped: 0, errors };
}

function readExistingPersistedState(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(NEW_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

// ── Migration ─────────────────────────────────────────────────────────────────

/**
 * Snapshots all localStorage keys at call time to avoid index-shift
 * during subsequent delete operations.
 */
function snapshotKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) keys.push(key);
  }
  return keys;
}
