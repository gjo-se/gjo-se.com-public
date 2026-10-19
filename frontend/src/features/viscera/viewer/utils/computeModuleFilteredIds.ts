import type { FilteredNodeIds } from './computeFilteredNodeIds';
import type { ImportModule } from '../../core/modulesSchema';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ModuleFilterInput {
  modules: ImportModule[];
  focusModuleId: string | null;
  focusMode: 'focus' | 'reaches' | 'impact' | null;
  collapsedIds: string[];
}

// ── Pure Function ────────────────────────────────────────────────────────────

/**
 * Compute which L4 module node IDs should be dimmed or hidden based on the
 * module interaction state (focus / reaches / impact / collapse).
 *
 * **Pure function** – no side effects, deterministic output for given inputs.
 *
 * ## Semantics
 *
 * | Mode     | Visible                                    | Rest              |
 * |----------|--------------------------------------------|-------------------|
 * | focus    | only the focused module                    | dimmed            |
 * | reaches  | focused module + transitive imports (BFS)  | dimmed            |
 * | impact   | focused module + transitive importers (BFS)| dimmed            |
 * | collapse | collapsed module + its transitive imports  | hidden (kein Dim) |
 *
 * - **Focus/Reaches/Impact** operate via BFS over the `imports` adjacency
 *   (forward for reaches, reverse-built adjacency for impact).
 * - **Collapse** hides the collapsed module plus everything it transitively
 *   imports, regardless of focus mode.
 * - **Precedence:** hidden wins over dimmed (mirrors `computeFilteredNodeIds`).
 *
 * @param input - Modules + interaction state.
 * @returns Two disjoint sets of node IDs (`dimmedNodeIds` / `hiddenNodeIds`).
 */
export function computeModuleFilteredIds(input: ModuleFilterInput): FilteredNodeIds {
  const { modules, focusModuleId, focusMode, collapsedIds } = input;
  const dimmedNodeIds = new Set<string>();
  const hiddenNodeIds = new Set<string>();

  // No focus and no collapsed modules → both sets empty (early return).
  if (!focusModuleId || !focusMode) {
    if (collapsedIds.length === 0) return { dimmedNodeIds, hiddenNodeIds };
  }

  // Build forward adjacency (module → its imports) and reverse adjacency
  // (module → its importers).
  const forward = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();
  modules.forEach((m) => {
    forward.set(m.name, m.imports);
    m.imports.forEach((imp) => {
      const list = reverse.get(imp) ?? [];
      list.push(m.name);
      reverse.set(imp, list);
    });
  });

  // Focus / Reaches / Impact: BFS from the focused module over the relevant
  // adjacency; every non-visible module is dimmed.
  if (focusModuleId && focusMode) {
    const adjacency = focusMode === 'reaches' ? forward : reverse;
    const visible = new Set<string>([focusModuleId]);
    const queue = [focusModuleId];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      (adjacency.get(current) ?? []).forEach((neighbor) => {
        if (!visible.has(neighbor)) {
          visible.add(neighbor);
          queue.push(neighbor);
        }
      });
    }
    modules.forEach((m) => {
      if (!visible.has(m.name)) {
        dimmedNodeIds.add(m.name);
      }
    });
  }

  // Collapse: hide the collapsed module plus everything it transitively imports.
  collapsedIds.forEach((collapsed) => {
    if (!forward.has(collapsed)) return;
    const queue = [collapsed];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (hiddenNodeIds.has(current)) continue;
      hiddenNodeIds.add(current);
      (forward.get(current) ?? []).forEach((n) => queue.push(n));
    }
  });

  // Precedence: hidden wins over dimmed – never dim a hidden node.
  hiddenNodeIds.forEach((id) => dimmedNodeIds.delete(id));

  return { dimmedNodeIds, hiddenNodeIds };
}
