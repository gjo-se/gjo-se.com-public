import Accordion from './Accordion';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Accordion',
  component: Accordion,
  tags: ['autodocs'],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: '<items>',
    variant: 'body',
    weight: 'semibold',
    name: 'chevron-down',
  },
};
