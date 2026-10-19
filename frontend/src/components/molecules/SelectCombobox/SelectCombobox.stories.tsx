import SelectCombobox from './SelectCombobox';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/SelectCombobox',
  component: SelectCombobox,
  tags: ['autodocs'],
} satisfies Meta<typeof SelectCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    options: '<options>',
    value: 0,
    onCommit: 0,
    clearLabel: 'Keinen Wert setzen',
    as: 'span',
    size: 'xs',
    color: 'muted',
    allowClear: false,
    autoFocus: false,
  },
};
