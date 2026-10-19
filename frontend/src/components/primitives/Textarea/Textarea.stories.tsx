import Textarea from './Textarea';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Textarea',
  component: Textarea,
  tags: ['autodocs'],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    resize: 'vertical',
    slot: 'textarea',
  },
};
