import ProjectEnrichDialog from './ProjectEnrichDialog';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/ProjectEnrichDialog',
  component: ProjectEnrichDialog,
  tags: ['autodocs'],
} satisfies Meta<typeof ProjectEnrichDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'sm',
    as: 'span',
    weight: 'semibold',
    color: 'error',
    label: 'Kontakt',
    placeholder: 'Person suchen…',
    emptyText: 'Keine Person gefunden',
    variant: 'secondary',
  },
};
