import FilterCombobox from './FilterCombobox';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/FilterCombobox',
  component: FilterCombobox,
  tags: ['autodocs'],
} satisfies Meta<typeof FilterCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: '\\u2013',
    type: 'button',
    variant: 'ghost',
    size: 'icon-xs',
    title: 'Filter zurücksetzen',
    label: 'Filter zurücksetzen',
    compact: false,
  },
};
