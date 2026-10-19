import Breadcrumb from './Breadcrumb';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Breadcrumb',
    variant: 'body',
    color: 'muted',
    name: 'chevron-right',
  },
};
