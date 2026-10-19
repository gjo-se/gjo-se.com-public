import DetailSection from './DetailSection';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/DetailSection',
  component: DetailSection,
  tags: ['autodocs'],
} satisfies Meta<typeof DetailSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '<title>',
    children: 'DetailSection',
    as: 'span',
    size: 'xs',
    weight: 'medium',
    color: 'muted',
  },
};
