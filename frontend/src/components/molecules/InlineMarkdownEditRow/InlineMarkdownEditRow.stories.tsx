import InlineMarkdownEditRow from './InlineMarkdownEditRow';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/InlineMarkdownEditRow',
  component: InlineMarkdownEditRow,
  tags: ['autodocs'],
} satisfies Meta<typeof InlineMarkdownEditRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    as: 'label',
    size: 'xs',
    weight: 'medium',
    color: 'muted',
    role: 'button',
  },
};
