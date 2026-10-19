import AddSlaveCombobox from './AddSlaveCombobox';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/AddSlaveCombobox',
  component: AddSlaveCombobox,
  tags: ['autodocs'],
} satisfies Meta<typeof AddSlaveCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Projekt suchen...',
    variant: 'destructive',
    size: 'sm',
  },
};
