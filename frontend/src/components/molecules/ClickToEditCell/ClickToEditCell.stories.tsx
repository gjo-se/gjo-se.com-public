import ClickToEditCell from './ClickToEditCell';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/ClickToEditCell',
  component: ClickToEditCell,
  tags: ['autodocs'],
} satisfies Meta<typeof ClickToEditCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'cell',
  },
};
