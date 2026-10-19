import TableRowActions from './TableRowActions';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'table/TableRowActions',
  component: TableRowActions,
  tags: ['autodocs'],
} satisfies Meta<typeof TableRowActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    testLabel: 'Testen',
    deleteConfirmLabel: 'Wirklich löschen?',
    testVariant: 'default',
    variant: 'destructive',
    size: 'sm',
    name: 'trash-2',
    title: 'Löschen bestätigen',
    label: 'Löschen',
    as: 'p',
    color: 'muted',
    isActive: true,
    testing: false,
    children: 'TableRowActions',
  },
};
