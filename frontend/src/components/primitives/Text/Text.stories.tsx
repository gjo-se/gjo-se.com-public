import Text from './Text';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Text',
  component: Text,
  tags: ['autodocs'],
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'body',
    mono: false,
    uppercase: false,
    tabular: false,
  },
};
