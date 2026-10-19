import ArchivedSkillEditModal from './ArchivedSkillEditModal';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/ArchivedSkillEditModal',
  component: ArchivedSkillEditModal,
  tags: ['autodocs'],
} satisfies Meta<typeof ArchivedSkillEditModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    skill: '<skill>',
    open: false,
    onOpenChange: false,
    onSaved: 0,
    size: 'xs',
    layout: 'inline',
    as: 'span',
    color: 'muted',
    variant: 'ghost',
    title: 'Master-Zuordnung entfernen',
    label: 'Master-Zuordnung entfernen',
    name: 'x',
  },
};
