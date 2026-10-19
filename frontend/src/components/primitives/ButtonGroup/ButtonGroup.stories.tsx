import ButtonGroup from './ButtonGroup';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/ButtonGroup',
  component: ButtonGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    orientation: 'horizontal',
    slot: 'button-group',
  },
};
