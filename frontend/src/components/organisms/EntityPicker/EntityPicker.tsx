import { useCallback, useMemo, useState } from 'react';

import TagBadge from '@src/components/atoms/TagBadge/TagBadge';
import TagColorPalette from '@src/components/atoms/TagColorPalette/TagColorPalette';
import Button from '@src/components/primitives/Button/Button';
import Checkbox from '@src/components/primitives/Checkbox/Checkbox';
import Icon from '@src/components/primitives/Icon/Icon';
import Input from '@src/components/primitives/Input/Input';
import Popover from '@src/components/primitives/Popover/Popover';
import PopoverContent from '@src/components/primitives/Popover/PopoverContent';
import PopoverTrigger from '@src/components/primitives/Popover/PopoverTrigger';
import Spinner from '@src/components/primitives/Spinner/Spinner';
import Text from '@src/components/primitives/Text/Text';
import { COLOR_TOKEN_CSS, type ColorToken } from '@src/lib/colorTokens';

import EntityOptionIcon from './EntityOptionIcon';
import { filterOptions, toggleKey, useEntityGroups, useTypeaheadSearch } from './EntityPicker.logic';
import { DEFAULT_CATEGORY_OPTIONS, DEFAULT_CREATE_FORM } from './EntityPicker.types';
import { MAX_VISIBLE_TAGS, TYPEAHEAD_MIN_CHARS } from './EntityPicker.utils';
import { entityPickerCreateAreaVariants, entityPickerOptionsVariants, entityPickerPopoverVariants } from './EntityPicker.variants';

import type { EntityPickerProps } from './EntityPicker.interface';
import type { EntityOption, EntityPickerCreateForm } from './EntityPicker.types';

export type { EntityPickerProps } from './EntityPicker.interface';

/**
 * EntityPicker – Generic picker for Tags, Status, and Technology entities.
 *
 * Opens a Popover with:
 * - A debounced search field (300ms)
 * - Optional typeahead mode via `onSearch` (e.g. Technology empty-start-list)
 * - Category-grouped or flat option list
 * - Multi-select (checkboxes) or single-select (radio behaviour)
 * - Inline-create form (when showCreate=true and onCreate provided)
 *
 * Selected entities appear as TagBadge chips in the trigger area and can be removed
 * via the × button.
 */
export type { EntityPickerVariants } from './EntityPicker.variants';

export default function EntityPicker({
  entityType,
  selectionMode,
  options,
  selectedKeys,
  onKeysChange,
  grouped: groupedProp,
  showSearch = true,
  showCreate = false,
  onCreate,
  onSearch,
  placeholder = 'Suchen...',
  disabled = false,
}: EntityPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<EntityPickerCreateForm>(DEFAULT_CREATE_FORM);
  const [creating, setCreating] = useState(false);

  // ── Resolve grouped default per entity type ──────────────────────────────
  const grouped = groupedProp ?? (entityType === 'tag');

  // ── Typeahead vs client-filter ───────────────────────────────────────────
  const { results: typeaheadResults, loading: typeaheadLoading } = useTypeaheadSearch(
    search,
    onSearch,
  );

  // Display options: typeahead results (when onSearch + search active) or client-filtered
  const displayOptions = useMemo(() => {
    if (onSearch) {
      // Typeahead mode: show results only when search has >= 2 chars
      if (search.length < TYPEAHEAD_MIN_CHARS) return [];
      return typeaheadResults;
    }
    return filterOptions(options, search);
  }, [onSearch, search, typeaheadResults, options]);

  const isLoading = onSearch ? typeaheadLoading : false;

  // ── Groups ───────────────────────────────────────────────────────────────
  const groupedOptions = useEntityGroups(displayOptions);

  // ── Selected entity lookup ───────────────────────────────────────────────
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const optionMap = useMemo(
    () => new Map(options.map((opt) => [opt.slug, opt])),
    [options],
  );

  // Selected entities for the trigger area (from the full options list)
  const selectedEntities = useMemo(
    () => selectedKeys.map((key) => optionMap.get(key)).filter((opt) => opt != null),
    [selectedKeys, optionMap],
  );

  const visibleEntities = selectedEntities.slice(0, MAX_VISIBLE_TAGS);
  const overflowCount = selectedEntities.length - MAX_VISIBLE_TAGS;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleToggle = useCallback(
    (key: string) => {
      onKeysChange(toggleKey(key, selectedKeys, selectionMode));
    },
    [selectedKeys, onKeysChange, selectionMode],
  );

  const handleRemove = useCallback(
    (key: string) => {
      onKeysChange(selectedKeys.filter((k) => k !== key));
    },
    [selectedKeys, onKeysChange],
  );

  const handleCreate = useCallback(async () => {
    if (!createForm.name.trim() || !onCreate) return;
    setCreating(true);
    try {
      const newSlug = await onCreate(
        createForm.name.trim(),
        createForm.category,
        createForm.colorToken,
      );
      onKeysChange(
        selectionMode === 'single' ? [newSlug] : [...selectedKeys, newSlug],
      );
      setCreateForm(DEFAULT_CREATE_FORM);
      setShowCreateForm(false);
    } catch {
      // Error handling delegated to onCreate callback
    } finally {
      setCreating(false);
    }
  }, [createForm, selectedKeys, onKeysChange, onCreate, selectionMode]);

  // Reset create form when popover closes
  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setShowCreateForm(false);
      setCreateForm(DEFAULT_CREATE_FORM);
      setSearch('');
    }
  }, []);

  // ── Render helpers ───────────────────────────────────────────────────────

  /** Safe cast of colorToken string to ColorToken (validated by API). */
  const toColorToken = (token: string): ColorToken => token as ColorToken;

  const selectionIndicator = (key: string) => {
    if (selectionMode === 'single') {
      // Radio-style indicator
      const isSelected = selectedSet.has(key);
      const css = COLOR_TOKEN_CSS[toColorToken(optionMap.get(key)?.colorToken || 'gray')];
      return (
        <div
          className={[
            'inline-flex size-4 shrink-0 items-center justify-center rounded-full border-2',
            isSelected ? css.border : 'border-muted-foreground/40',
          ].join(' ')}
        >
          {isSelected && <div className={['size-2 rounded-full', css.dot].join(' ')} />}
        </div>
      );
    }
    return <Checkbox checked={selectedSet.has(key)} onChange={() => {}} />;
  };

  const searchPlaceholder = () => {
    if (entityType === 'technology') return 'Technologie suchen...';
    if (entityType === 'status') return 'Status suchen...';
    return 'Tags suchen...';
  };

  const createLabel = () => {
    if (entityType === 'status') return 'Neuen Status erstellen';
    if (entityType === 'technology') return 'Neue Technologie erstellen';
    return 'Neuen Tag erstellen';
  };

  /** Anzeigename: Tags zeigen „Kategorie: Name" (z. B. „Cost: Free"), sonst nur Name. */
  const displayName = (entity: EntityOption) => {
    if (entityType === 'tag' && entity.category) return `${entity.category}: ${entity.name}`;
    return entity.name;
  };

  const emptyMessage = () => {
    if (onSearch && search.length < TYPEAHEAD_MIN_CHARS) {
      return 'Mindestens 2 Zeichen eingeben';
    }
    return 'Keine Ergebnisse';
  };

  /** Ein Optionseintrag – von gruppierter und flacher Liste gemeinsam genutzt. */
  const renderOption = (opt: EntityOption) => (
    <label
      key={opt.slug}
      onClick={() => handleToggle(opt.slug)}
      className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 hover:bg-muted"
    >
      {selectionIndicator(opt.slug)}
      <EntityOptionIcon iconUrl={opt.iconUrl} name={opt.name} />
      <TagBadge
        name={opt.name}
        colorToken={toColorToken(opt.colorToken)}
        variant="dot"
        size="sm"
      />
    </label>
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger>
        <div
          className={[
            'flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          ].join(' ')}
        >
          {visibleEntities.map((entity) => (
            <div key={entity.slug} className="inline-flex items-center gap-0.5">
              <TagBadge
                name={displayName(entity)}
                colorToken={toColorToken(entity.colorToken)}
                size="sm"
              />
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`${displayName(entity)} entfernen`}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleRemove(entity.slug);
                }}
              >
                <Icon name="x" size="xs" />
              </Button>
            </div>
          ))}
          {overflowCount > 0 && (
            <Text size="xs" color="muted">{`+${overflowCount}`}</Text>
          )}
          {selectedEntities.length === 0 && (
            <Text size="sm" color="muted">{placeholder}</Text>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent side="bottom" align="start" sideOffset={4}>
        <div className={entityPickerPopoverVariants()}>
          {/* Search field */}
          {showSearch && (
            <Input
              placeholder={searchPlaceholder()}
              value={search}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            />
          )}

          {/* Options list */}
          <div className={entityPickerOptionsVariants()}>
            {isLoading && (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            )}

            {!isLoading && displayOptions.length === 0 && (
              <div className="py-4">
                <Text size="sm" color="muted" align="center">{emptyMessage()}</Text>
              </div>
            )}

            {!isLoading &&
              (grouped
                ? Array.from(groupedOptions.entries()).map(([category, categoryOptions]) => (
                  <div key={category} className="mb-2">
                    <div className="mb-0.5 px-1 py-0.5">
                      <Text
                        size="xs"
                        color="muted"
                        weight="semibold"
                      >
                        {category}
                      </Text>
                    </div>
                    {categoryOptions.map(renderOption)}
                  </div>
                ))
                : displayOptions.map(renderOption))}
          </div>

          {/* Inline Create area */}
          {showCreate && onCreate && (
            <div className={entityPickerCreateAreaVariants()}>
              {!showCreateForm ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(true)}
                >
                  <Icon name="plus-circle" size="sm" />
                  <Text as="span" size="sm">{createLabel()}</Text>
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Input
                    placeholder="Name"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        name: (e.target as HTMLInputElement).value,
                      }))
                    }
                  />
                  <select
                    className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={createForm.category}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        category: e.target.value,
                      }))
                    }
                  >
                    {DEFAULT_CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <TagColorPalette
                    value={createForm.colorToken}
                    onSelect={(token) =>
                      setCreateForm((f) => ({ ...f, colorToken: token }))
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      disabled={!createForm.name.trim() || creating}
                      onClick={handleCreate}
                    >
                      {creating ? 'Wird erstellt...' : 'Erstellen'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCreateForm(false);
                        setCreateForm(DEFAULT_CREATE_FORM);
                      }}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
