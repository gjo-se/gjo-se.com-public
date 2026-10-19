import Footer from './Footer';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/Footer',
  component: Footer,
  tags: ['autodocs'],
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'sm',
    color: 'muted',
    orientation: 'vertical',
    variant: 'muted',
    children: 'Footer',
  },
};
