import FieldRow from './FieldRow';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/FieldRow',
  component: FieldRow,
  tags: ['autodocs'],
} satisfies Meta<typeof FieldRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'sm',
    color: 'muted',
    as: 'span',
  },
};
