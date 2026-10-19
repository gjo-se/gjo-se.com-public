import MonoBadge from './MonoBadge';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/MonoBadge',
  component: MonoBadge,
  tags: ['autodocs'],
} satisfies Meta<typeof MonoBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
};
