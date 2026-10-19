import type { StateCreator, StoreMutatorIdentifier } from 'zustand';

// ═══════════════════════════════════════════════════════════════════════════════
// Key → Slice Mapping
// ═══════════════════════════════════════════════════════════════════════════════
//
// Maps top-level store keys to their owning slice for logger output.

const KEY_TO_SLICE: Record<string, string> = {
  viewport: 'Canvas',
  nodeOverrides: 'Diagram',
  nodes: 'Diagram',
  edges: 'Diagram',
  interaction: 'Canvas',
  viewKey: 'Navigation',
  detailContainerId: 'Navigation',
  objectId: 'Navigation',
  objectTab: 'Navigation',
  mode: 'Navigation',
  badgeStates: 'Filter',
  hoveredKey: 'Filter',
  activeFilterCount: 'Filter',
  activeFlowId: 'Flow',
  stepIndex: 'Flow',
  playState: 'Flow',
  stepCount: 'Flow',
  isFullscreen: 'UI',
  shortcutsOpen: 'UI',
  panelCollapsed: 'UI',
  splitRatioAdr: 'Editor',
  splitRatioYaml: 'Editor',
};

/**
 * Detect which slices changed between prev and next state snapshots.
 * Returns deduplicated slice names sorted alphabetically.
 */
function detectChangedSlices(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): string[] {
  const slices = new Set<string>();
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  allKeys.forEach((key) => {
    if (prev[key] !== next[key]) {
      const slice = KEY_TO_SLICE[key];
      if (slice) slices.add(slice);
    }
  });
  return [...slices].sort();
}

/**
 * Extract an action name from the set() arguments.
 *
 * Zustand's `set` signature: `set(partial, replace?, actionName?)`
 * Uses the third argument if it's a string, otherwise falls back to `setState`.
 */
function extractActionName(args: readonly unknown[]): string {
  if (args.length >= 3 && typeof args[2] === 'string') {
    return args[2];
  }
  return 'setState';
}

/**
 * Logger Middleware for Zustand (v5).
 *
 * Logs every state change to the browser console in dev mode only.
 * Vite tree-shakes the entire logging block in production builds
 * (`import.meta.env.DEV` is replaced with `false` at build time).
 *
 * Log format: `[VisceraStore] <Slice>.<action> – prev: {…} → next: {…}`
 *
 * **Middleware stack position:** between `immer` (inner) and `subscribeWithSelector` (outer).
 */
export function logger<
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  config: StateCreator<T, Mps, Mcs>,
): StateCreator<T, Mps, Mcs> {
  return (set, get, api) => {
    // Zustand's set function signature: set(partial, replace?, actionName?)
    // We wrap it to intercept calls for logging in dev mode.
    //
    // The `set` parameter has a complex overloaded type (augmented by immer
    // and devtools middleware chains), which prevents direct spread/rest.
    // We use `unknown[]` as the universal forwarding type — this is the
    // established Zustand middleware pattern for intercepting setState calls.
    const loggedSet = ((...args: unknown[]) => {
      // Narrow `set` to an unconstrained callable so we can spread `unknown[]`.
      // This is type-safe: we only forward args, never inspect or construct them.
      const forward = set as unknown as (...a: unknown[]) => void;

      if (import.meta.env.DEV) {
        const prevState = get() as Record<string, unknown>;
        forward(...args);
        const nextState = get() as Record<string, unknown>;

        const changedSlices = detectChangedSlices(prevState, nextState);
        const actionName = extractActionName(args);
        const sliceLabel =
          changedSlices.length > 0 ? changedSlices.join(',') : 'Store';

        console.groupCollapsed(
          `[VisceraStore] ${sliceLabel}.${actionName}`,
        );
        console.log('prev:', prevState);
        console.log('next:', nextState);
        console.groupEnd();
      } else {
        forward(...args);
      }
    }) as typeof set;

    return config(loggedSet, get, api);
  };
}
