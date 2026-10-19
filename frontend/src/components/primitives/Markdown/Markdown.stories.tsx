import Markdown from './Markdown';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Markdown',
  component: Markdown,
  tags: ['autodocs'],
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Markdown',
    variant: 'default',
  },
};
