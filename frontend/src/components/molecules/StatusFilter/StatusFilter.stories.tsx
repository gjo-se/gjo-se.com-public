import StatusFilter from './StatusFilter';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/StatusFilter',
  component: StatusFilter,
  tags: ['autodocs'],
} satisfies Meta<typeof StatusFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    as: 'span',
    size: 'xs',
    color: 'secondary',
  },
};
