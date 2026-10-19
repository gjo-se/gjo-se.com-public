import Combobox from './Combobox';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Combobox',
  component: Combobox,
  tags: ['autodocs'],
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'combobox',
    undefined: false,
  },
};
