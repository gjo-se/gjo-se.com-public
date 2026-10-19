import ConfirmDialog from './ConfirmDialog';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    cancelLabel: 'Abbrechen',
    confirmLabel: 'Bestätigen',
    cancelVariant: 'secondary',
    confirmVariant: 'destructive',
    size: 'sm',
    showCloseButton: true,
  },
};
