import Toggle from './Toggle';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Toggle',
  component: Toggle,
  tags: ['autodocs'],
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    size: 'default',
    slot: 'toggle',
  },
};
