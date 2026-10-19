import SectionHeading from './SectionHeading';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/SectionHeading',
  component: SectionHeading,
  tags: ['autodocs'],
} satisfies Meta<typeof SectionHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    as: 'h2',
    variant: 'title',
  },
};
