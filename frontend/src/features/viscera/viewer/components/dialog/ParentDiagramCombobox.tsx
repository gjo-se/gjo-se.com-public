/**
 * ParentDiagramCombobox – Context-sensitive parent object selector.
 *
 * Filters available objects by the selected diagram type:
 * - systemContext → no parent (always empty)
 * - container     → only systems
 * - component     → only containers and stores
 *
 * Uses shadcn Select (same pattern as Type/Layout dropdowns) to avoid
 * base-ui Dialog inert-overlay z-index conflicts with Combobox portals (#2254).
 */
import { cva } from 'class-variance-authority';
import { useMemo } from 'react';

import Text from '@src/components/primitives/Text/Text';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/components/vendor/shadcn/select';
import { useWorkspace } from '@src/features/viscera/core/useWorkspace';
import type { ArchitectureObject } from '@src/features/viscera/core/workspaceSchema';

import FieldLabel from './FieldLabel';

const typeChipVariants = cva('ml-2 rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800');
const typeChipInlineVariants = cva('ml-2 shrink-0 rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800');
const emptyStateVariants = cva('px-2 py-1.5 text-sm text-muted-foreground');
const truncateVariants = cva('truncate');

// ── Props ────────────────────────────────────────────────────────────────────

export interface ParentDiagramComboboxProps {
  /** Currently selected diagram type. Determines which object types are valid parents. */
  diagramType: string;
  /** Current parent object ID (or null). */
  value: string | null;
  /** Called when the user selects a parent (object ID or null for none). */
  onChange: (value: string | null) => void;
  /** Whether the dropdown is disabled. */
  disabled?: boolean;
}

// ── Type Mapping ─────────────────────────────────────────────────────────────

/** Maps diagram type → allowed parent object types. */
const PARENT_TYPES: Record<string, string[]> = {
  systemContext: [],
  container: ['system'],
  component: ['container', 'store'],
};

/** Human-readable label for object types. */
const TYPE_LABELS: Record<string, string> = {
  system: 'System',
  container: 'Container',
  store: 'Store',
  component: 'Component',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function filterCandidates(
  objects: ArchitectureObject[],
  allowedTypes: string[],
): ArchitectureObject[] {
  return objects.filter((obj) => obj.type && allowedTypes.includes(obj.type));
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 *
 */
export default function ParentDiagramCombobox({
  diagramType,
  value,
  onChange,
  disabled = false,
}: ParentDiagramComboboxProps) {
  const { workspace } = useWorkspace();

  const allowedTypes = useMemo(() => PARENT_TYPES[diagramType] ?? [], [diagramType]);

  const candidates = useMemo<ArchitectureObject[]>(() => {
    if (allowedTypes.length === 0) return [];
    return filterCandidates(workspace?.objects ?? [], allowedTypes);
  }, [workspace, allowedTypes]);

  const selectedObj = useMemo(
    () => candidates.find((o) => o.id === value) ?? null,
    [value, candidates],
  );

  // No parent options for this diagram type
  if (allowedTypes.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel label="Parent" optional />
        <Text size="sm" color="muted">
          Kein Parent für diesen Diagramm-Typ verfügbar.
        </Text>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor="diagram-parent-select" label="Parent" optional />
      <Select value={value ?? ''} onValueChange={(v) => onChange(v || null)} disabled={disabled}>
        <SelectTrigger id="diagram-parent-select" className="w-full">
          <SelectValue placeholder="Kein Parent">
            {selectedObj && (
              <div className="flex items-center">
                <Text as="span" size="sm" color="on-surface">
                  {selectedObj.name}
                </Text>
                {selectedObj.type && (
                  <div className={typeChipVariants()}>
                    <Text as="span" size="xs" color="muted">
                      {TYPE_LABELS[selectedObj.type] ?? selectedObj.type}
                    </Text>
                  </div>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {candidates.length === 0 && (
            <div className={emptyStateVariants()}>
              Keine Objekte verfügbar.
            </div>
          )}
          {candidates.map((obj) => (
            <SelectItem key={obj.id} value={obj.id}>
              <div className={truncateVariants()}>
                <Text as="span" size="sm" color="on-surface">{obj.name}</Text>
              </div>
              {obj.type && (
                <div className={typeChipInlineVariants()}>
                  <Text as="span" size="xs" color="muted">
                    {TYPE_LABELS[obj.type] ?? obj.type}
                  </Text>
                </div>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
