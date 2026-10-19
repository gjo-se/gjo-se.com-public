import InputGroup from './InputGroup';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/InputGroup',
  component: InputGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'input-group',
    role: 'group',
  },
};
