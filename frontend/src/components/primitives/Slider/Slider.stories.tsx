import Slider from './Slider';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Slider',
  component: Slider,
  tags: ['autodocs'],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'default',
    slot: 'thumb',
    min: 0,
    max: 100,
    step: 1,
  },
};
