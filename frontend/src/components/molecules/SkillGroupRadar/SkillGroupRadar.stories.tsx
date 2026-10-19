import SkillGroupRadar from './SkillGroupRadar';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/SkillGroupRadar',
  component: SkillGroupRadar,
  tags: ['autodocs'],
} satisfies Meta<typeof SkillGroupRadar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    group_id: 0,
    label: '<label>',
    skills: '<skills>',
    role: 'button',
    as: 'span',
    size: 'sm',
    color: 'muted',
    id: 'skills.fallback.tooFew',
    fullWidth: false,
    base: false,
    medium: 4,
  },
};
