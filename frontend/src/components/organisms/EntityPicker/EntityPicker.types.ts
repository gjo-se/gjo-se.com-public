import type { ColorToken } from '@src/lib/colorTokens';

// ── Core Types ────────────────────────────────────────────────────────────────

/** Unified option shape for all entity types (Tag, Status, Technology). */
export interface EntityOption {
  slug: string;
  name: string;
  colorToken: string;
  category?: string;
  type?: string;
  sortOrder?: number;
  /** Optional technology icon URL – rendered as a small icon in the option row. */
  iconUrl?: string | null;
}

// ── Inline Create ─────────────────────────────────────────────────────────────

/** Form state for the inline-create mini-form. */
export interface EntityPickerCreateForm {
  name: string;
  category: string;
  colorToken: ColorToken;
}

/** Discriminated entity type for styling/label adjustments. */
export type EntityType = 'tag' | 'status' | 'technology';

/** Selection mode for the picker. */
export type SelectionMode = 'single' | 'multi';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default form state for the inline-create form. */
export const DEFAULT_CREATE_FORM: EntityPickerCreateForm = {
  name: '',
  category: 'General',
  colorToken: 'gray',
};

/** Default category options for the inline-create dropdown. */
export const DEFAULT_CATEGORY_OPTIONS = [
  'General',
  'Risk',
  'Cost',
  'Deployment',
  'Security',
  'Compliance',
  'Performance',
];
