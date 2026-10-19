import ColorPicker from './ColorPicker';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/ColorPicker',
  component: ColorPicker,
  tags: ['autodocs'],
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultValue: '#000000',
  },
};
