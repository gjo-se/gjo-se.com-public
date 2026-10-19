import RadioGroup from './RadioGroup';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    orientation: 'vertical',
  },
};
