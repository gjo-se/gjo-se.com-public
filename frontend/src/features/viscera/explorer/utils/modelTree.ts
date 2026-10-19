import type { ModelObject, ModelObjectType } from '../hooks/useModelExplorer';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TreeNode {
  object: ModelObject;
  depth: number;
  hasChildren: boolean;
}

// ── Pure Functions ─────────────────────────────────────────────────────────────

/**
 * Builds a flat, ordered list of nodes for tree rendering.
 * Expands nodes whose id is in `expandedIds`.
 */
export function buildVisibleTree(
  objects: ModelObject[],
  expandedIds: Set<string>,
): TreeNode[] {
  const childrenMap = new Map<string, ModelObject[]>();
  objects.forEach((obj) => {
    const parentId = obj.parentId ?? '__root__';
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(obj);
  });

  const result: TreeNode[] = [];

  function walk(parentId: string, depth: number) {
    const children = childrenMap.get(parentId);
    if (!children || children.length === 0) return;

    const sorted = [...children].sort((a, b) => {
      const typeOrder: ModelObjectType[] = ['system', 'store', 'container', 'component', 'person'];
      const aTypeIdx = typeOrder.indexOf(a.type);
      const bTypeIdx = typeOrder.indexOf(b.type);
      if (aTypeIdx !== bTypeIdx) return aTypeIdx - bTypeIdx;
      return a.name.localeCompare(b.name);
    });

    sorted.forEach((obj) => {
      const childObjects = childrenMap.get(obj.id);
      const hasChildren = (childObjects?.length ?? 0) > 0;
      result.push({ object: obj, depth, hasChildren });

      if (expandedIds.has(obj.id)) {
        walk(obj.id, depth + 1);
      }
    });
  }

  walk('__root__', 0);
  return result;
}
