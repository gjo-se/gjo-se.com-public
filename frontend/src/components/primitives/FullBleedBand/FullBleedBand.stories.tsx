import FullBleedBand from './FullBleedBand';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/FullBleedBand',
  component: FullBleedBand,
  tags: ['autodocs'],
} satisfies Meta<typeof FullBleedBand>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'FullBleedBand',
    padding: 'default',
    hidden: true,
  },
};
