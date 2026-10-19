import Switch from './Switch';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Switch',
  component: Switch,
  tags: ['autodocs'],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    checked: false,
    onChange: false,
    size: 'default',
    slot: 'thumb',
  },
};
