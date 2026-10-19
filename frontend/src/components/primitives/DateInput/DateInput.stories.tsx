import DateInput from './DateInput';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/DateInput',
  component: DateInput,
  tags: ['autodocs'],
} satisfies Meta<typeof DateInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    position: 'bottom-start',
    shadow: 'md',
    type: 'button',
    locale: 'de',
  },
};
