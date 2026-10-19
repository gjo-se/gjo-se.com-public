import DetailPagerNav from './DetailPagerNav';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/DetailPagerNav',
  component: DetailPagerNav,
  tags: ['autodocs'],
} satisfies Meta<typeof DetailPagerNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    prevId: 0,
    nextId: 0,
    onPrev: '<onPrev>',
    onNext: '<onNext>',
    variant: 'outline',
    size: 'sm',
    label: 'Nächstes Projekt',
    name: 'chevron-right',
    loading: false,
  },
};
