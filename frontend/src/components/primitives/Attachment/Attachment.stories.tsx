import Attachment from './Attachment';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Attachment',
  component: Attachment,
  tags: ['autodocs'],
} satisfies Meta<typeof Attachment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    state: 'done',
    size: 'default',
    orientation: 'horizontal',
    slot: 'attachment',
  },
};
