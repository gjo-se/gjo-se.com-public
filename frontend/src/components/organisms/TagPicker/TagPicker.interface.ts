export interface TagPickerProps {
  /** Currently selected tag IDs (controlled component). */
  selectedTagIds: number[];
  /** Called with the new array of tag IDs when a tag is added or removed. */
  onTagsChange: (tagIds: number[]) => void;
  /** Optional taggable type for API context (e.g. "fbf_skill"). */
  taggableType?: string;
  /** Placeholder text for the trigger when no tags are selected. */
  placeholder?: string;
  /** When true, the trigger is non-interactive. */
  disabled?: boolean;
  /** Show the search field inside the popover. Default: true. */
  showSearch?: boolean;
  /** Show the inline-create form for new tags. Default: true. */
  showCreate?: boolean;
}
