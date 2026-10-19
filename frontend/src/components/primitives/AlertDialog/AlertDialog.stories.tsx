import AlertDialog from './AlertDialog';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/AlertDialog',
  component: AlertDialog,
  tags: ['autodocs'],
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: false,
    onOpenChange: false,
    title: '<title>',
    onConfirm: '<onConfirm>',
    cancelLabel: 'Abbrechen',
    confirmLabel: 'Bestätigen',
    variant: 'secondary',
    weight: 'semibold',
    color: 'muted',
    destructive: false,
  },
};
