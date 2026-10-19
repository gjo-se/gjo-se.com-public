import Time from './Time';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Time',
  component: Time,
  tags: ['autodocs'],
} satisfies Meta<typeof Time>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
};
