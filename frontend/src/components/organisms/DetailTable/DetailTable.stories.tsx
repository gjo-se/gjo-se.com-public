import DetailTable from './DetailTable';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/DetailTable',
  component: DetailTable,
  tags: ['autodocs'],
} satisfies Meta<typeof DetailTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '<title>',
    rows: '<rows>',
    onSave: '<onSave>',
    as: 'span',
    size: 'xs',
    weight: 'medium',
    color: 'muted',
  },
};
