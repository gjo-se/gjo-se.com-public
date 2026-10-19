import StatusCell from './StatusCell';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'atoms/StatusCell',
  component: StatusCell,
  tags: ['autodocs'],
} satisfies Meta<typeof StatusCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
};
