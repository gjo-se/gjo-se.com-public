import FileUpload from './FileUpload';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'forms/FileUpload',
  component: FileUpload,
  tags: ['autodocs'],
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Datei auswählen oder hierher ziehen',
    role: 'button',
    name: 'upload',
    variant: 'muted',
    as: 'span',
    color: 'muted',
    type: 'file',
    multiple: false,
    disabled: false,
    children: 'FileUpload',
  },
};
