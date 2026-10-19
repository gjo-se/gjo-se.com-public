import ContentElementHeader from './ContentElementHeader';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/ContentElementHeader',
  component: ContentElementHeader,
  tags: ['autodocs'],
} satisfies Meta<typeof ContentElementHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Tech Stack',
    subtitle: 'Meine Technologien',
    variant: 'h2',
    color: 'muted',
    children: 'ContentElementHeader',
  },
};
