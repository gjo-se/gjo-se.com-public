import CodeBlock from './CodeBlock';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/CodeBlock',
  component: CodeBlock,
  tags: ['autodocs'],
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    code: '<code>',
    language: '<language>',
    as: 'span',
    size: 'xs',
    color: 'muted',
    variant: 'green',
    label: 'Code kopieren',
    name: 'copy',
  },
};
