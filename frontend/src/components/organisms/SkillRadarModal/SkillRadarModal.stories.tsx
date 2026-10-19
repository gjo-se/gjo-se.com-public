import SkillRadarModal from './SkillRadarModal';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/SkillRadarModal',
  component: SkillRadarModal,
  tags: ['autodocs'],
} satisfies Meta<typeof SkillRadarModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: false,
    onOpenChange: false,
    label: '<label>',
    skills: '<skills>',
    variant: 'secondary',
    size: 'sm',
    as: 'span',
    color: 'muted',
  },
};
