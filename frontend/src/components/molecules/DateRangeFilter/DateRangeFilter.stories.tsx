import DateRangeFilter from './DateRangeFilter';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/DateRangeFilter',
  component: DateRangeFilter,
  tags: ['autodocs'],
} satisfies Meta<typeof DateRangeFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
};
