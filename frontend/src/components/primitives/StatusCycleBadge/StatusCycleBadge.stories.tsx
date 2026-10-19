import StatusCycleBadge from './StatusCycleBadge';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/StatusCycleBadge',
  component: StatusCycleBadge,
  tags: ['autodocs'],
} satisfies Meta<typeof StatusCycleBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    currentName: '<currentName>',
    currentColor: '<currentColor>',
    nextName: '<nextName>',
    onCycle: '<onCycle>',
    type: 'button',
    disabled: false,
  },
};
