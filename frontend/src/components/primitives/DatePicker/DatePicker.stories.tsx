import DatePicker from './DatePicker';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    from: '<from>',
    to: '<to>',
    onFromChange: '<onFromChange>',
    onToChange: '<onToChange>',
    onPreset: '<onPreset>',
    onClear: '<onClear>',
    position: 'bottom-start',
    shadow: 'md',
    variant: 'subtle',
    align: 'flex-start',
    wrap: 'nowrap',
    gap: 'xs',
    py: 'md',
    px: 'sm',
    size: 'sm',
    color: 'red',
    type: 'range',
  },
};
