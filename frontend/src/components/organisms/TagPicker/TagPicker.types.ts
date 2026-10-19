import type { CoreTagOut } from '@src/lib/api/coreCatalog';
import type { ColorToken } from '@src/lib/colorTokens';

/** State for the inline-create mini-form. */
export interface CreateTagForm {
  name: string;
  category: string;
  colorToken: ColorToken;
}

/** Internal tag item used for checkbox rendering in the picker. */
export interface TagItem {
  tag: CoreTagOut;
  selected: boolean;
}

/** Default form state for the inline-create form. */
export const DEFAULT_CREATE_FORM: CreateTagForm = {
  name: '',
  category: 'General',
  colorToken: 'gray',
};

/** Predefined category options for the inline-create dropdown. */
export const CATEGORY_OPTIONS = [
  'Risk',
  'Cost',
  'Deployment',
  'General',
  'Security',
  'Compliance',
  'Performance',
];
