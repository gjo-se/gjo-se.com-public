import NativeSelect from './NativeSelect';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/NativeSelect',
  component: NativeSelect,
  tags: ['autodocs'],
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'default',
    slot: 'native-select',
    name: 'chevron-down',
  },
};
