import ToggleGroup from './ToggleGroup';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/ToggleGroup',
  component: ToggleGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    orientation: 'horizontal',
    slot: 'toggle-group',
    spacing: 2,
  },
};
