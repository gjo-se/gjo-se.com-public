import SectionGrid from './SectionGrid';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/SectionGrid',
  component: SectionGrid,
  tags: ['autodocs'],
} satisfies Meta<typeof SectionGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    columns: 2,
  },
};
