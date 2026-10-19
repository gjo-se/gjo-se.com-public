import TextSections from './TextSections';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/TextSections',
  component: TextSections,
  tags: ['autodocs'],
} satisfies Meta<typeof TextSections>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    color: 'secondary',
    children: 'TextSections',
  },
};
