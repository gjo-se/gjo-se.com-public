import FormField from './FormField';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'forms/FormField',
  component: FormField,
  tags: ['autodocs'],
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    FormFieldType: 'text',
    type: 'text',
    id: 'ff-${name}',
    lang: 'de',
    size: 'xs',
    color: 'error',
    children: 'FormField',
  },
};
