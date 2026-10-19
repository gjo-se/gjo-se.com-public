import Marker from './Marker';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Marker',
  component: Marker,
  tags: ['autodocs'],
} satisfies Meta<typeof Marker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    slot: 'marker',
  },
};
