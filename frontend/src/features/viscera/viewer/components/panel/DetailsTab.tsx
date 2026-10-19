import { cva } from 'class-variance-authority';
import { useCallback, useMemo } from 'react';

import EntityPicker from '@src/components/organisms/EntityPicker/EntityPicker';
import type { EntityOption } from '@src/components/organisms/EntityPicker/EntityPicker.types';
import Button from '@src/components/primitives/Button/Button';
import Text from '@src/components/primitives/Text/Text';
import { useEntityCache } from '@src/features/viscera/core/useEntityCache';
import { useWorkspace } from '@src/features/viscera/core/useWorkspace';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';
import { fetchTechnologies } from '@src/lib/api/technologyCatalog';

import { EditableField } from '../field/EditableField';
import { ToggleEditor } from '../field/ToggleEditor';

import type { ObjectDetail, DetailField } from '../../hooks/useObjectDetail';
import type { WriteResult } from '../../hooks/useYamlWrite';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DetailsTabProps {
  detail: ObjectDetail;
  copied: boolean;
  onCopy: () => void;
  /** Callback invoked when an editable field is saved. */
  onFieldSave: (objectId: string, field: string, value: unknown) => Promise<WriteResult>;
  /** Full status-change handler (rejected-dialog, derived, workspace sync). */
  onStatusChange: (newStatus: string) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const FIELD_ROW_CLASS =
  'grid grid-cols-[160px_1fr] items-start gap-x-4 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50';

const DESC_BOX_CLASS =
  'relative rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900';

const CONTAINER_CLASS =
  'overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';

const HEADER_STRIP_CLASS =
  'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2';

const labelCellVariants = cva('min-w-0');
const valueColumnVariants = cva('flex min-w-0 flex-col gap-1.5');
const textCellVariants = cva('min-w-0 break-words');

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Details tab content for ObjectDetailsPanel.
 * Renders object metadata as key-value rows with editable name and description.
 */
export function DetailsTab({ detail, copied, onCopy, onFieldSave, onStatusChange }: DetailsTabProps) {
  const store = useVisceraStore();
  const { workspace, updateWorkspace } = useWorkspace();
  const { tagMap, statusMap, technologyMap } = useEntityCache();

  // ── EntityPicker options ─────────────────────────────────────────────────
  const tagOptions: EntityOption[] = useMemo(
    () =>
      Array.from(tagMap.values())
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((e) => ({ slug: e.slug, name: e.name, colorToken: e.colorToken, category: e.category })),
    [tagMap],
  );

  const statusOptions: EntityOption[] = useMemo(
    () =>
      Array.from(statusMap.values())
        .filter((e) => e.category === 'viscera')
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((e) => ({ slug: e.slug, name: e.name, colorToken: e.colorToken, category: e.category })),
    [statusMap],
  );

  const allTechnologyOptions: EntityOption[] = useMemo(
    () =>
      Array.from(technologyMap.values()).map((e) => ({
        slug: e.slug,
        name: e.name,
        colorToken: e.colorToken,
        category: e.category,
      })),
    [technologyMap],
  );

  // ── Server-side typeahead for technology (large catalog, empty start list) ──
  // Der Catalog umfasst tausende Einträge – lokal zu laden und zu filtern wäre
  // unverhältnismäßig. Der BE-Endpoint filtert server-seitig via `q` (ILIKE
  // name/slug, `_MAX_LIMIT` 500). `onSearch` im EntityPicker triggert ab 2 Zeichen.
  const handleTechSearch = useCallback(
    async (query: string): Promise<EntityOption[]> => {
      const entries = await fetchTechnologies({ q: query, limit: 50, sort_by: 'name', sort_dir: 'asc' });
      return entries.map((e) => ({
        slug: e.slug,
        name: e.name,
        colorToken: e.color_token,
        category: e.type ?? undefined,
        type: e.type ?? undefined,
        iconUrl: e.icons?.find((i) => i.icon_url)?.icon_url ?? null,
      }));
    },
    [],
  );

  // ── Entity write handlers ──────────────────────────────────────────────
  const handleTagsChange = useCallback(
    async (keys: string[]) => {
      if (!detail.objectId) return;
      store.updateNodeTags(detail.objectId, keys);
      // Sync workspace context so UI (picker trigger chips) updates immediately
      if (workspace) {
        await updateWorkspace({
          ...workspace,
          objects: workspace.objects?.map((o) =>
            o.id === detail.objectId ? { ...o, tags: keys } : o,
          ),
        });
      }
    },
    [detail.objectId, store, workspace, updateWorkspace],
  );

  const handleStatusChange = useCallback(
    (keys: string[]) => {
      if (!detail.objectId) return;
      onStatusChange(keys[0] ?? '');
    },
    [detail.objectId, onStatusChange],
  );

  const handleTechnologiesChange = useCallback(
    async (keys: string[]) => {
      if (!detail.objectId) return;
      store.updateNodeTechnologies(detail.objectId, keys);
      // Sync workspace context so UI (picker + candidate chips) updates immediately
      if (workspace) {
        await updateWorkspace({
          ...workspace,
          objects: workspace.objects?.map((o) =>
            o.id === detail.objectId ? { ...o, technologies: keys } : o,
          ),
        });
      }
    },
    [detail.objectId, store, workspace, updateWorkspace],
  );

  // ── Technology candidates (scan suggestions, not pre-selected) ──────────
  const unselectedCandidates = useMemo(() => {
    const selected = new Set(detail.technologies);
    return detail.technologyCandidates.filter((c) => !selected.has(c.slug));
  }, [detail.technologyCandidates, detail.technologies]);

  const handleCandidateAdd = useCallback(
    (slug: string) => {
      handleTechnologiesChange([...detail.technologies, slug]);
    },
    [detail.technologies, handleTechnologiesChange],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Fields (grid) */}
      <div className={CONTAINER_CLASS}>
        <div className={HEADER_STRIP_CLASS}>
          <Text as="span" size="xs" weight="medium" uppercase color="muted">
            Metadata
          </Text>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {renderFields(detail.fields).map((row) => (
            <div key={row.field} className={FIELD_ROW_CLASS}>
              <div className={labelCellVariants()}>
                <Text as="label" size="xs" weight="medium" uppercase color="muted">
                  {row.label}
                </Text>
              </div>
              <div className={valueColumnVariants()}>
                {renderFieldValue(
                  row,
                  detail,
                  onFieldSave,
                  tagOptions,
                  statusOptions,
                  allTechnologyOptions,
                  handleTagsChange,
                  handleStatusChange,
                  handleTechnologiesChange,
                  handleTechSearch,
                )}
                {row.field === 'technologies' && row.editable && detail.objectId && unselectedCandidates.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <Text as="span" size="xs" color="muted">
                      Vorschläge:
                    </Text>
                    {unselectedCandidates.map((c) => (
                      <Button
                        key={c.slug}
                        variant="outline"
                        size="sm"
                        title={`Slug: ${c.slug}${c.source ? ` \u00B7 Quelle: ${c.source}` : ''}`}
                        onClick={() => handleCandidateAdd(c.slug)}
                      >
                        {c.name}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Description (LLM-ready) */}
      <div>
        <div className="mb-2 block">
          <Text weight="semibold" size="sm">
            Description (LLM-ready)
          </Text>
        </div>
        <div className={DESC_BOX_CLASS}>
          {detail.objectId ? (
            <EditableField
              value={detail.description}
              field="description"
              objectId={detail.objectId}
              onSave={onFieldSave}
              multiline
            />
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-sans">
              {detail.description || '\u2014'}
            </pre>
          )}
          <div className="mt-3 flex justify-end">
            <Button
              variant={copied ? 'default' : 'outline'}
              size="sm"
              onClick={onCopy}
            >
              {copied ? 'Copied!' : 'Copy for Kilo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats a field value for display when it's not editable.
 */
function formatDisplayValue(row: DetailField): string {
  const val = row.value;
  if (row.field === 'tags' && Array.isArray(val)) {
    const slugs = val as string[];
    return slugs.join(', ') || '\u2014';
  }
  if (row.field === 'technologies' && Array.isArray(val)) {
    const slugs = val as string[];
    return slugs.join(', ') || '\u2014';
  }
  if (row.field === 'external') {
    return val ? 'Yes' : 'No';
  }
  if (typeof val === 'string') return val || '\u2014';
  if (val === null || val === undefined) return '\u2014';
  return String(val);
}

/**
 * Renders detail fields excluding internal/structural ones (type, id)
 * that are already shown in the header.
 */
function renderFields(fields: DetailField[]): DetailField[] {
  return fields.filter((f) => f.field !== 'id');
}

/**
 * Renders the appropriate editor or display value for a detail field.
 */
function renderFieldValue(
  row: DetailField,
  detail: ObjectDetail,
  onFieldSave: (objectId: string, field: string, value: unknown) => Promise<WriteResult>,
  tagOptions: EntityOption[],
  statusOptions: EntityOption[],
  technologyOptions: EntityOption[],
  onTagsChange: (keys: string[]) => Promise<void>,
  onStatusChange: (keys: string[]) => void,
  onTechnologiesChange: (keys: string[]) => Promise<void>,
  onTechSearch: (query: string) => Promise<EntityOption[]>,
) {
  // Non-editable fields — display as text
  if (!row.editable || !detail.objectId) {
    const display = formatDisplayValue(row);
    return (
      <div className={textCellVariants()}>
        <Text size="sm">
          {display}
        </Text>
      </div>
    );
  }

  switch (row.editor) {
    case 'entity-single':
      return (
        <EntityPicker
          entityType="status"
          selectionMode="single"
          options={statusOptions}
          selectedKeys={
            typeof row.value === 'string' && row.value ? [row.value] : []
          }
          onKeysChange={onStatusChange}
          grouped={false}
          placeholder="Status auswählen..."
        />
      );
    case 'entity-multi': {
      const isTechnology = row.field === 'technologies';
      return (
        <EntityPicker
          entityType={isTechnology ? 'technology' : 'tag'}
          selectionMode="multi"
          options={isTechnology ? technologyOptions : tagOptions}
          selectedKeys={Array.isArray(row.value) ? row.value as string[] : []}
          onKeysChange={isTechnology ? onTechnologiesChange : onTagsChange}
          grouped={!isTechnology}
          placeholder={isTechnology ? 'Technologien auswählen...' : 'Tags auswählen...'}
          onSearch={isTechnology ? onTechSearch : undefined}
        />
      );
    }
    case 'toggle':
      return (
        <ToggleEditor
          value={Boolean(row.value)}
          field={row.field}
          objectId={detail.objectId}
          onSave={onFieldSave}
        />
      );
    case 'select':
      return (
        <select
          value={String(row.value ?? '')}
          onChange={(e) => {
            onFieldSave(detail.objectId!, row.field, e.target.value);
          }}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {(row.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    default:
      return (
        <EditableField
          value={String(row.value ?? '')}
          field={row.field}
          objectId={detail.objectId}
          onSave={onFieldSave}
          multiline={row.field === 'description'}
        />
      );
  }
}
