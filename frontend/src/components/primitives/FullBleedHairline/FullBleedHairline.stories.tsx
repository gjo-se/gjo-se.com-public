import FullBleedHairline from './FullBleedHairline';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/FullBleedHairline',
  component: FullBleedHairline,
  tags: ['autodocs'],
} satisfies Meta<typeof FullBleedHairline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    edge: 'bottom',
    hidden: true,
  },
};
