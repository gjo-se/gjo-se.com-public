import type { IconName } from '@src/components/primitives/Icon';

export const tableRowActionsRegistry = {
  toggle: {
    icon: 'check' as IconName,
    label: 'Umschalten',
  },
  delete: {
    icon: 'trash-2' as IconName,
    label: 'Löschen',
    confirm: 'Wirklich löschen?',
  },
  edit: {
    icon: 'pencil' as IconName,
    label: 'Bearbeiten',
  },
  test: {
    icon: 'search' as IconName,
    label: 'Testen',
  },
} as const;
