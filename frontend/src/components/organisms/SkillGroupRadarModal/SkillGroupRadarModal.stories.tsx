import SkillGroupRadarModal from './SkillGroupRadarModal';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/SkillGroupRadarModal',
  component: SkillGroupRadarModal,
  tags: ['autodocs'],
} satisfies Meta<typeof SkillGroupRadarModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: false,
    onOpenChange: false,
    groups: '<groups>',
    initialGroupId: 0,
    role: 'dialog',
    modal: true,
    label: 'Nächste Gruppe',
    as: 'span',
    variant: 'meta',
    color: 'secondary',
    size: 'xs',
    name: 'chevron-right',
    id: 'skills.fallback.tooFew',
  },
};
