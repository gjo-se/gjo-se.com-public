import type { EntityOption, EntityType, SelectionMode } from './EntityPicker.types';

/**
 * Props for the EntityPicker component (closed API – no className).
 *
 * The picker is generic: `entityType` drives cosmetic labels; behaviour is
 * controlled by `selectionMode`, `onSearch`, and `showCreate`.
 */
export interface EntityPickerProps {
  /** Discriminated entity type for label/styling tweaks. */
  entityType: EntityType;

  /** Selection mode: 'single' shows radio behaviour, 'multi' shows checkboxes. */
  selectionMode: SelectionMode;

  /** All available options (pre-loaded from useEntityCache). */
  options: EntityOption[];

  /** Currently selected entity keys (slugs). */
  selectedKeys: string[];

  /** Called with the new array of keys when selection changes. */
  onKeysChange: (keys: string[]) => void;

  /** Group options by category in the dropdown. Default: true for tags, false otherwise. */
  grouped?: boolean;

  /** Show the search field inside the popover. Default: true. */
  showSearch?: boolean;

  /** Show the inline-create form. Default: false (only for admin forms). */
  showCreate?: boolean;

  /**
   * Called when the user submits the inline-create form.
   * Must return the new entity's slug so it can be added to selectedKeys.
   */
  onCreate?: (name: string, category?: string, colorToken?: string) => Promise<string>;

  /**
   * Typeahead callback for server-side search (used by Technology with empty start list).
   * When provided, client-side filtering is disabled and results come from this callback.
   * Triggered after 2+ characters with 300ms debounce.
   */
  onSearch?: (query: string) => Promise<EntityOption[]>;

  /** Placeholder text for the trigger area when no items are selected. */
  placeholder?: string;

  /** When true, the trigger is non-interactive. */
  disabled?: boolean;
}
