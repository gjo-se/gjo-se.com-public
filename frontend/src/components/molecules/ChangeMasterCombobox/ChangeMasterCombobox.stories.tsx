import ChangeMasterCombobox from './ChangeMasterCombobox';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/ChangeMasterCombobox',
  component: ChangeMasterCombobox,
  tags: ['autodocs'],
} satisfies Meta<typeof ChangeMasterCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Projekt-ID oder Titel…',
    emptyText: 'Keine Master-Projekte gefunden',
  },
};
