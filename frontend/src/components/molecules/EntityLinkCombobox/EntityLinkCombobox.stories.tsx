import EntityLinkCombobox from './EntityLinkCombobox';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/EntityLinkCombobox',
  component: EntityLinkCombobox,
  tags: ['autodocs'],
} satisfies Meta<typeof EntityLinkCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    confirmVariant: 'dialog',
    placeholder: 'Firma suchen…',
    emptyText: 'Keine Firmen gefunden',
    confirmTitle: 'Sicherheitsabfrage',
    as: 'span',
    size: 'xs',
    type: 'button',
    variant: 'badge-remove',
    title: 'Verknüpfung lösen',
  },
};
